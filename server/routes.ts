import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs/promises";
import path from "path";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document as LangchainDocument } from "@langchain/core/documents";
import { pool } from "./db";

const upload = multer({ dest: "uploads/" });

// Initialize PGVector store
const embeddings = new OpenAIEmbeddings({
  modelName: "text-embedding-3-small",
});

async function getVectorStore() {
  return await PGVectorStore.initialize(embeddings, {
    pool,
    tableName: "knowledge_base",
    columns: {
      idColumnName: "id",
      vectorColumnName: "embedding",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Create uploads directory if it doesn't exist
  await fs.mkdir("uploads", { recursive: true }).catch(() => {});

  app.get(api.documents.list.path, async (req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs.map(d => ({
        ...d,
        uploadDate: d.uploadDate?.toISOString() || new Date().toISOString()
      })));
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post(api.documents.upload.path, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const file = req.file;
      const originalName = file.originalname;
      const fileExt = path.extname(originalName).toLowerCase();

      // Ensure API key is set
      if (!process.env.OPENAI_API_KEY) {
         return res.status(500).json({ message: "OPENAI_API_KEY is not configured" });
      }

      // Load document
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

      // Chunk document
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });

      const chunkedDocs = await splitter.splitDocuments(docs);
      
      // Save metadata to db
      const docRecord = await storage.createDocument({
        filename: originalName,
        fileType: fileExt,
      });

      // Add metadata to chunks
      const chunksWithMetadata = chunkedDocs.map((chunk, index) => {
        chunk.metadata = {
          ...chunk.metadata,
          source_file: originalName,
          doc_id: docRecord.id,
          chunk_index: index,
        };
        return chunk;
      });

      // Generate embeddings and store in PGVector
      const vectorStore = await getVectorStore();
      await vectorStore.addDocuments(chunksWithMetadata);

      // Clean up uploaded file
      await fs.unlink(file.path);

      res.status(201).json({
        id: docRecord.id,
        filename: docRecord.filename,
        message: "File ingested successfully"
      });

    } catch (error: any) {
      console.error("Upload error:", error);
      res.status(500).json({ message: error.message || "Failed to process document" });
    }
  });

  app.delete(api.documents.delete.path, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }

      // First delete from vector store
      // The PGVectorStore wrapper in LangChain doesn't have a direct "delete by metadata" method,
      // so we'll execute a direct SQL query to remove associated vectors.
      await pool.query(
        "DELETE FROM knowledge_base WHERE metadata->>'doc_id' = $1",
        [id.toString()]
      );

      // Delete from metadata storage
      await storage.deleteDocument(id);

      res.status(200).json({ message: "Document deleted" });
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.post(api.chat.query.path, async (req, res) => {
    try {
      const { query } = api.chat.query.input.parse(req.body);

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ message: "OPENAI_API_KEY is not configured" });
      }

      const vectorStore = await getVectorStore();
      
      // Retrieve top 5 chunks
      const results = await vectorStore.similaritySearch(query, 5);

      if (results.length === 0) {
        return res.status(200).json({
          answer: "I don't have enough information in my knowledge base to answer this question.",
          sources: []
        });
      }

      // Format context
      const contextText = results.map(r => r.pageContent).join("\\n\\n");

      // Generate answer
      const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.7,
      });

      const prompt = `You are an AI assistant helping a user query their personal knowledge base.
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, just say that you don't know or don't have enough information.
Always cite your sources if possible.

Context:
${contextText}

Question: ${query}

Answer:`;

      const response = await llm.invoke(prompt);

      res.status(200).json({
        answer: response.content as string,
        sources: results.map(r => ({
          filename: r.metadata.source_file || "Unknown",
          content: r.pageContent,
        }))
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Failed to process query" });
    }
  });

  return httpServer;
}
