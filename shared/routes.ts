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