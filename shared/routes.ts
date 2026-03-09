import { z } from 'zod';

export const api = {
  documents: {
    list: {
      method: 'GET' as const,
      path: '/api/documents' as const,
      responses: {
        200: z.array(z.object({
          id: z.number(),
          filename: z.string(),
          fileType: z.string(),
          uploadDate: z.string(),
        })),
      },
    },
    upload: {
      method: 'POST' as const,
      path: '/api/documents' as const,
      responses: {
        201: z.object({
          id: z.number(),
          filename: z.string(),
          message: z.string()
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      }
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/documents/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      }
    }
  },
  chat: {
    query: {
      method: 'POST' as const,
      path: '/api/chat' as const,
      input: z.object({
        query: z.string(),
      }),
      responses: {
        200: z.object({
          answer: z.string(),
          sources: z.array(z.object({
            filename: z.string(),
            content: z.string(),
          }))
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string() }),
      }
    }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
