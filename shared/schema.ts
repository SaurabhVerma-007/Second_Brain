import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { customType } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// llama-3.2-nemoretriever-300m-embed-v1 outputs 1024-dim vectors
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return `vector(2048)`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  fileType: text("fileType").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding"),
  uploadDate: timestamp("uploadDate").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadDate: true,
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;