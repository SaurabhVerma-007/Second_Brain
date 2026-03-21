import { db } from "./db";
import { documents, type Document, type InsertDocument } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  searchByVector(embedding: number[], topK?: number): Promise<Document[]>;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents);
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    // Use raw SQL for the vector column — Drizzle's type system doesn't handle pgvector cleanly
    if (doc.embedding && Array.isArray(doc.embedding)) {
      const vectorString = `[${(doc.embedding as number[]).join(",")}]`;
      const result = await db.execute(sql`
        INSERT INTO documents (filename, "fileType", content, embedding)
        VALUES (
          ${doc.filename},
          ${doc.fileType},
          ${doc.content},
          ${vectorString}::vector
        )
        RETURNING *
      `);
      return result.rows[0] as Document;
    }
    // Fallback: insert without embedding
    const [newDoc] = await db
      .insert(documents)
      .values({ filename: doc.filename, fileType: doc.fileType, content: doc.content })
      .returning();
    return newDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Cosine similarity search using pgvector's <=> operator
  async searchByVector(embedding: number[], topK = 10): Promise<Document[]> {
    const vectorString = `[${embedding.join(",")}]`;
    const results = await db.execute(sql`
      SELECT id, filename, "fileType", content, "uploadDate"
      FROM documents
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${topK}
    `);
    return results.rows as Document[];
  }
}

export const storage = new DatabaseStorage();