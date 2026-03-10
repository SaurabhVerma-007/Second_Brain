import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import multer from "multer";
import fs from "fs/promises";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { Document as LangchainDocument } from "@langchain/core/documents";
import OpenAI from "openai";

const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
      const fileExt = file.originalname.toLowerCase().slice(-4);

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
      
      // Combine all chunks into full content
      const fullContent = chunkedDocs.map(c => c.pageContent).join("\n\n");

      // Save document with full content
      const docRecord = await storage.createDocument({
        filename: originalName,
        fileType: fileExt,
        content: fullContent,
      });

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

      // Simple full-text search: find documents where content contains the query (case-insensitive)
      const allDocs = await storage.getDocuments();
      const relevantDocs = allDocs.filter(doc => 
        doc.content && doc.content.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5); // Top 5

      if (relevantDocs.length === 0) {
        return res.status(200).json({
          answer: "I don't have enough information in my knowledge base to answer this question.",
          sources: []
        });
      }

      // Format context from relevant documents
      const contextText = relevantDocs
        .map(doc => `[${doc.filename}]\n${doc.content.slice(0, 1000)}...`)
        .join("\n\n");

      // Generate answer with GPT
      const prompt = `You are an AI assistant helping a user query their personal knowledge base.
Use the following pieces of retrieved context to answer the user's question.
If you don't know the answer based on the context, just say that you don't know or don't have enough information.
Always cite your sources if possible.

Context:
${contextText}

Question: ${query}

Answer:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 8192,
      });

      res.status(200).json({
        answer: response.choices[0]?.message?.content || "Unable to generate response",
        sources: relevantDocs.map(doc => ({
          filename: doc.filename,
          content: doc.content.slice(0, 500),
        }))
      });

    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ message: error.message || "Failed to process query" });
    }
  });

  return httpServer;
}
