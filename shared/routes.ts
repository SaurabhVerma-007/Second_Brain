import { z } from "zod";

const documentSchema = z.object({
  id: z.number(),
  filename: z.string(),
  fileType: z.string(),
  uploadDate: z.string(),
});

const uploadResponseSchema = z.object({
  id: z.number(),
  filename: z.string(),
  message: z.string(),
});

export const api = {
  documents: {
    list: {
      path: "/api/documents",
      method: "GET" as const,
      responses: {
        200: z.array(documentSchema),
      },
    },
    upload: {
      path: "/api/documents",
      method: "POST" as const,
      responses: {
        201: uploadResponseSchema,
      },
    },
    delete: {
      path: "/api/documents/:id",
      method: "DELETE" as const,
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
  },
  chat: {
    query: {
      path: "/api/chat",
      method: "POST" as const,
      input: z.object({
        query: z.string().min(1),
      }),
      responses: {
        200: z.object({
          answer: z.string(),
          sources: z.array(
            z.object({
              filename: z.string(),
              content: z.string(),
            })
          ),
        }),
      },
    },
  },
};

export function buildUrl(
  path: string,
  params: Record<string, string | number> = {}
): string {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}