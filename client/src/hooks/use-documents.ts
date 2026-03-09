import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
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

export function useDocuments() {
  return useQuery({
    queryKey: [api.documents.list.path],
    queryFn: async () => {
      const res = await fetch(api.documents.list.path, { credentials: "include" });
      if (!res.ok) throw new Error('Failed to fetch documents');
      const data = await res.json();
      return parseWithLogging(api.documents.list.responses[200], data, "documents.list");
    },
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch(api.documents.upload.path, {
        method: api.documents.upload.method,
        body: formData,
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload document');
      }
      
      return parseWithLogging(api.documents.upload.responses[201], data, "documents.upload");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast({
        title: "Upload Successful",
        description: `${data.filename} has been added to your knowledge base.`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message,
      });
    }
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.documents.delete.path, { id });
      const res = await fetch(url, { 
        method: api.documents.delete.method, 
        credentials: "include" 
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete document');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.documents.list.path] });
      toast({
        title: "Document Deleted",
        description: "The document and its contents have been removed.",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: error.message,
      });
    }
  });
}
