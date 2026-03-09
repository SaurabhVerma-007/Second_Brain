import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// We only store the document metadata here.
// The chunks and embeddings will be managed by LangChain's PGVectorStore automatically.
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("fileType").notNull(),
  uploadDate: timestamp("uploadDate").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, uploadDate: true });
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
