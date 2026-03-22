import os
from dotenv import load_dotenv
load_dotenv()

import shutil
import tempfile
import httpx
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from openai import OpenAI

from pypdf import PdfReader


from server.db import get_db
from server.storage import storage

router = APIRouter()

NVIDIA_API_KEY = os.environ.get("NVIDIA_API_KEY")
if not NVIDIA_API_KEY:
    raise RuntimeError("NVIDIA_API_KEY must be set in your .env file.")

nvidia = OpenAI(
    api_key=NVIDIA_API_KEY,
    base_url="https://integrate.api.nvidia.com/v1",
)

EMBED_MODEL  = "nvidia/llama-3.2-nemoretriever-300m-embed-v1"
RERANK_MODEL = "nvidia/rerank-qa-mistral-4b"
ANSWER_MODEL = "qwen/qwen3.5-122b-a10b"

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

class ChatRequest(BaseModel):
    query: str

class DocumentResponse(BaseModel):
    id: int
    filename: str
    fileType: str
    uploadDate: str

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]

def embed_text(text: str, input_type: str = "passage") -> list[float]:
    response = nvidia.embeddings.create(
        model=EMBED_MODEL,
        input=text,
        encoding_format="float",
        extra_body={"input_type": input_type, "truncate": "END"},
    )
    return response.data[0].embedding

def rerank_documents(query: str, passages: list[str]) -> Optional[list[dict]]:
    urls = [
        "https://integrate.api.nvidia.com/v1/ranking",
        "https://ai.api.nvidia.com/v1/retrieval/nvidia/rerank-qa-mistral-4b/reranking",
    ]
    body = {
        "model": RERANK_MODEL,
        "query": {"text": query},
        "passages": [{"text": p} for p in passages],
        "truncate": "END",
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {NVIDIA_API_KEY}",
    }
    for url in urls:
        try:
            with httpx.Client(timeout=30) as client:
                resp = client.post(url, json=body, headers=headers)
                if resp.status_code == 200:
                    data = resp.json()
                    return sorted(data["rankings"], key=lambda x: x["logit"], reverse=True)
                print(f"[rerank] {url} returned {resp.status_code}, trying next...")
        except Exception as e:
            print(f"[rerank] {url} failed: {e}")
    print("[rerank] All URLs failed - using vector order")
    return None

@router.get("/api/documents")
def list_documents(db: Session = Depends(get_db)):
    docs = storage.get_documents(db)
    return [
        {
            "id": d.id,
            "filename": d.filename,
            "fileType": d.fileType,
            "uploadDate": d.uploadDate.isoformat() if d.uploadDate else "",
        }
        for d in docs
    ]

@router.post("/api/documents")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()

    if ext not in {".txt", ".md", ".pdf"}:
        raise HTTPException(status_code=400, detail="Unsupported file type. Use .txt, .md, or .pdf")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        if ext == ".pdf":
            reader = PdfReader(tmp_path)
            raw_text = "\n\n".join(page.extract_text() or "" for page in reader.pages)
        else:
            with open(tmp_path, "r", encoding="utf-8") as f:
                raw_text = f.read()

        # Simple chunking without LangChain
        chunk_size = 500
        overlap = 50
        words = raw_text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += chunk_size - overlap
        full_content = "\n\n".join(chunks)

        print(f"[embed] Embedding '{filename}'...")
        embedding = embed_text(full_content, input_type="passage")

        doc = storage.create_document(
            db,
            filename=filename,
            file_type=ext,
            content=full_content,
            embedding=embedding,
        )

        return JSONResponse(
            status_code=201,
            content={
                "id": doc.id,
                "filename": doc.filename,
                "message": "File ingested and embedded successfully",
            },
        )
    finally:
        os.unlink(tmp_path)

@router.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, db: Session = Depends(get_db)):
    doc = storage.get_document(db, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    storage.delete_document(db, doc_id)
    return {"message": "Document deleted"}

@router.post("/api/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    print("[rag] Step 1: Embedding query...")
    query_embedding = embed_text(query, input_type="query")

    print("[rag] Step 2: Vector search...")
    candidates = storage.search_by_vector(db, query_embedding, top_k=10)

    if not candidates:
        return {
            "answer": "I don't have enough information in my knowledge base to answer this question.",
            "sources": [],
        }

    print("[rag] Step 3: Reranking...")
    passages = [doc.content[:2000] for doc in candidates]
    rankings = rerank_documents(query, passages)
    top_docs = [candidates[r["index"]] for r in rankings[:5]] if rankings else candidates[:5]

    print("[rag] Step 4: Generating answer with Qwen...")
    context = "\n\n---\n\n".join(
        f"[Source: {doc.filename}]\n{doc.content[:1500]}" for doc in top_docs
    )

    prompt = f"""You are a helpful AI assistant for a personal knowledge base called Second Brain.
Use ONLY the context below to answer the question.
If the context is insufficient, say so clearly.
Always mention which document(s) your answer is based on.

Context:
{context}

Question: {query}

Answer:"""

    response = nvidia.chat.completions.create(
        model=ANSWER_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=2048,
    )

    return {
        "answer": response.choices[0].message.content or "Unable to generate response",
        "sources": [
            {"filename": doc.filename, "content": doc.content[:500]}
            for doc in top_docs
        ],
    }