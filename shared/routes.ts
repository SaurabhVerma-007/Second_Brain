import { z } from "zod";

export const api = {
  documents: {
    list: {
      path: "/api/documents",
    },
    upload: {
      path: "/api/documents",
    },
    delete: {
      path: "/api/documents/:id",
    },
  },
  chat: {
    query: {
      path: "/api/chat",
      input: z.object({
        query: z.string().min(1),
      }),
    },
  },
};

// Helper to replace :param placeholders in paths
export function buildUrl(path: string, params: Record<string, string | number> = {}): string {
  let url = path;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(`:${key}`, String(value));
  }
  return url;
}