import { useState } from "react";
import { format } from "date-fns";
import { Trash2, FileText, Database, Search, Loader2 } from "lucide-react";
import { Layout } from "@/components/layout";
import { useDocuments, useDeleteDocument } from "@/hooks/use-documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function KnowledgeBase() {
  const { data: documents, isLoading } = useDocuments();
  const deleteMutation = useDeleteDocument();
  
  const [search, setSearch] = useState("");
  const [docToDelete, setDocToDelete] = useState<number | null>(null);

  const filteredDocs = documents?.filter(doc => 
    doc.filename.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (docToDelete === null) return;
    try {
      await deleteMutation.mutateAsync(docToDelete);
    } finally {
      setDocToDelete(null);
    }
  };

  const getFileTypeBadge = (type: string) => {
    if (type.includes("pdf")) return <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 border-none">PDF</Badge>;
    if (type.includes("markdown") || type.includes("md")) return <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 border-none">Markdown</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-100 border-none">Text</Badge>;
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Knowledge Base</h1>
            <p className="text-muted-foreground">
              Manage the documents your Second Brain uses for context.
            </p>
          </div>
          
          <div className="relative w-full md:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Search documents..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background shadow-sm border-border/60 focus-visible:ring-primary/20"
            />
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              ))}
            </div>
          ) : !documents || documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6">
                <Database className="w-10 h-10 text-primary/40" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No documents yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md">
                Your knowledge base is empty. Head over to the Upload page to start adding context to your Second Brain.
              </p>
            </div>
          ) : filteredDocs?.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium mb-1">No matches found</h3>
              <p className="text-muted-foreground">Try adjusting your search query.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-secondary/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[40%] font-semibold">Filename</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Upload Date</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs?.map((doc) => (
                  <TableRow key={doc.id} className="group hover:bg-secondary/20 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <span className="truncate max-w-[200px] md:max-w-[400px]" title={doc.filename}>
                          {doc.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getFileTypeBadge(doc.fileType)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(doc.uploadDate), "MMM d, yyyy h:mm a")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDocToDelete(doc.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <AlertDialog open={docToDelete !== null} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will remove it from the knowledge base and the AI will no longer be able to reference it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
