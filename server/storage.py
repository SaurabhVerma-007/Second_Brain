from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import text
from server.models import Document

class DatabaseStorage:

    def get_documents(self, db: Session) -> list[Document]:
        return db.query(Document).all()

    def get_document(self, db: Session, doc_id: int) -> Optional[Document]:
        return db.query(Document).filter(Document.id == doc_id).first()

    def create_document(
        self,
        db: Session,
        filename: str,
        file_type: str,
        content: str,
        embedding: Optional[list[float]] = None,
    ) -> Document:
        doc = Document(
            filename=filename,
            fileType=file_type,
            content=content,
            embedding=embedding,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return doc

    def delete_document(self, db: Session, doc_id: int) -> None:
        doc = self.get_document(db, doc_id)
        if doc:
            db.delete(doc)
            db.commit()

    def search_by_vector(
        self, db: Session, embedding: list[float], top_k: int = 10
    ) -> list[Document]:
        # Cosine similarity search using pgvector <=> operator
        vector_str = f"[{','.join(str(x) for x in embedding)}]"
        result = db.execute(
            text("""
                SELECT id, filename, "fileType", content, "uploadDate"
                FROM documents
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:vec AS vector)
                LIMIT :k
            """),
            {"vec": vector_str, "k": top_k},
        )
        rows = result.mappings().all()
        # Map rows back to Document-like objects
        docs = []
        for row in rows:
            doc = Document()
            doc.id         = row["id"]
            doc.filename   = row["filename"]
            doc.fileType   = row["fileType"]
            doc.content    = row["content"]
            doc.uploadDate = row["uploadDate"]
            docs.append(doc)
        return docs

storage = DatabaseStorage()