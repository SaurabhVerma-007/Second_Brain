import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import multer from "multer";
import fs from "fs/promises";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document as LangchainDocument } from "@langchain/core/documents";
import OpenAI from "openai";

const upload = multer({ dest: "uploads/" });

if (!process.env.NVIDIA_API_KEY) {
  throw new Error("NVIDIA_API_KEY must be set in your .env file.");
}

// Single NVIDIA NIM client — all 3 models share the same base URL
const nvidia = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// ─── Model identifiers ────────────────────────────────────────────────────────
const EMBED_MODEL  = "nvidia/llama-3.2-nemoretriever-300m-embed-v1";
const RERANK_MODEL = "nvidia/rerank-qa-mistral-4b";
const ANSWER_MODEL = "qwen/qwen3.5-122b-a10b";

// ─── Helper: embed text → number[] ───────────────────────────────────────────
async function embedText(text: string, inputType: "query" | "passage" = "passage"): Promise<number[]> {
  const response = await nvidia.embeddings.create({
    model: EMBED_MODEL,
    input: text,
    // @ts-ignore — NVIDIA NIM supports extra params not in base OpenAI types
    input_type: inputType,
    encoding_format: "float",
    truncate: "END",
  });
  return response.data[0].embedding;
}

// ─── Helper: rerank passages via NVIDIA NIM ranking endpoint ─────────────────
interface RankedDoc { index: number; logit: number; }

async function rerankDocuments(query: string, passages: string[]): Promise<RankedDoc[] | null> {
  const urls = [
    "https://integrate.api.nvidia.com/v1/ranking",
    "https://ai.api.nvidia.com/v1/retrieval/nvidia/rerank-qa-mistral-4b/reranking",
  ];
  const body = JSON.stringify({
    model: RERANK_MODEL,
    query: { text: query },
    passages: passages.map((text) => ({ text })),
    truncate: "END",
  });
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
        },
        body,
      });
      if (!response.ok) {
        console.warn(`[rerank] ${url} returned ${response.status}, trying next...`);
        continue;
      }
      const data = (await response.json()) as { rankings: RankedDoc[] };
      return data.rankings.sort((a, b) => b.logit - a.logit);
    } catch (e) {
      console.warn(`[rerank] ${url} failed:`, e);
    }
  }
  console.warn("[rerank] All URLs failed — skipping reranking, using vector results directly");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await fs.mkdir("uploads", { recursive: true }).catch(() => {});

  // ── GET /api/documents ────────────────────────────────────────────────────
  app.get(api.documents.list.path, async (req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs.map((d) => ({
        id: d.id,
        filename: d.filename,
        fileType: d.fileType,
        uploadDate: d.uploadDate?.toISOString() || new Date().toISOString(),
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // ── POST /api/documents — upload → chunk → embed → store ─────────────────
  app.post(api.documents.upload.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const file = req.file;
      const originalName = file.originalname;
      const fileExt = file.originalname.toLowerCase().slice(-4);

      // 1. Parse file
      let docs: LangchainDocument[] = [];
      if (fileExt === ".pdf") {
        const loader = new PDFLoader(file.path);
        docs = await loader.load();
      } else if (fileExt === ".txt" || fileExt === ".md") {
        const text = await fs.readFile(file.path, "utf-8");
        docs = [new LangchainDocument({ pageContent: text, metadata: {} })];
      } else {
        await fs.unlink(file.path);
        return res.status(400).json({ message: "Unsupported file type. Use .txt, .md, or .pdf" });
      }

      // 2. Chunk
      const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
      const chunkedDocs = await splitter.splitDocuments(docs);
      const fullContent = chunkedDocs.map((c) => c.pageContent).join("\n\n");

      // 3. Embed with llama-3.2-nemoretriever-300m-embed-v1
      console.log(`[embed] Embedding "${originalName}"...`);
      const embedding = await embedText(fullContent, "passage");

      // 4. Save to Supabase with vector
      const docRecord = await storage.createDocument({
        filename: originalName,
        fileType: fileExt,
        content: fullContent,
        embedding,
      });

      await fs.unlink(file.path);

      res.status(201).json({
        id: docRecord.id,
        filename: docRecord.filename,
        message: "File ingested and embedded successfully",
      });
    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process document" });
    }
  });

  // ── DELETE /api/documents/:id ─────────────────────────────────────────────
  app.delete(api.documents.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
      await storage.deleteDocument(id);
      res.status(200).json({ message: "Document deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // ── POST /api/chat — full 3-model RAG pipeline ────────────────────────────
  app.post(api.chat.query.path, async (req, res) => {
    try {
      const { query } = api.chat.query.input.parse(req.body);

      // STEP 1 — Embed the query
      console.log("[rag] Step 1: Embedding query...");
      const queryEmbedding = await embedText(query, "query");

      // STEP 2 — Vector similarity search (top 10 candidates)
      console.log("[rag] Step 2: Vector search...");
      const candidateDocs = await storage.searchByVector(queryEmbedding, 10);

      if (candidateDocs.length === 0) {
        return res.status(200).json({
          answer: "I don't have enough information in my knowledge base to answer this question.",
          sources: [],
        });
      }

      // STEP 3 — Rerank with rerank-qa-mistral-4b, keep top 5 (falls back to vector order if unavailable)
      console.log("[rag] Step 3: Reranking...");
      const passages = candidateDocs.map((doc) => doc.content.slice(0, 2000));
      const rankings = await rerankDocuments(query, passages);
      const topDocs = rankings
        ? rankings.slice(0, 5).map((r) => candidateDocs[r.index]).filter(Boolean)
        : candidateDocs.slice(0, 5);

      // STEP 4 — Generate answer with qwen3.5-122b-a10b
      console.log("[rag] Step 4: Generating answer with Qwen...");
      const contextText = topDocs
        .map((doc) => `[Source: ${doc.filename}]\n${doc.content.slice(0, 1500)}`)
        .join("\n\n---\n\n");

      const prompt = `You are a helpful AI assistant for a personal knowledge base called Second Brain.
Use ONLY the context below to answer the question.
If the context is insufficient, say so clearly.
Always mention which document(s) your answer is based on.

Context:
${contextText}

Question: ${query}

Answer:`;

      const response = await nvidia.chat.completions.create({
        model: ANSWER_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 2048,
      });

      res.status(200).json({
        answer: response.choices[0]?.message?.content || "Unable to generate response",
        sources: topDocs.map((doc) => ({
          filename: doc.filename,
          content: doc.content.slice(0, 500),
        })),
      });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Failed to process query" });
    }
  });

  return httpServer;
}