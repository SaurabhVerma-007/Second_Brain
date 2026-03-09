import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useChatQuery() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (query: string) => {
      const payload = api.chat.query.input.parse({ query });
      
      const res = await fetch(api.chat.query.path, {
        method: api.chat.query.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to get answer');
      }
      
      return parseWithLogging(api.chat.query.responses[200], data, "chat.query");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Query Failed",
        description: error.message,
      });
    }
  });
}
