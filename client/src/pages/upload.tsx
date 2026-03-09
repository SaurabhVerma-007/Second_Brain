import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, UploadCloud, X, File as FileIcon, Loader2, CheckCircle2 } from "lucide-react";
import { useUploadDocument } from "@/hooks/use-documents";

export default function Upload() {
  const [files, setFiles] = useState<File[]>([]);
  const uploadMutation = useUploadDocument();
  const [successStatus, setSuccessStatus] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setSuccessStatus(null);
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    
    // Process sequentially for simplicity and reliable toast messages
    // In a real app, you might want to process in parallel via Promise.all
    for (const file of files) {
      try {
        await uploadMutation.mutateAsync(file);
      } catch (error) {
        // Error is handled in the mutation toast
        return;
      }
    }
    
    setSuccessStatus(`Successfully ingested ${files.length} document${files.length > 1 ? 's' : ''}.`);
    setFiles([]);
  };

  return (
    <Layout>
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Upload Knowledge</h1>
          <p className="text-muted-foreground text-lg">
            Add documents to your Second Brain. The AI will ingest these to answer your future questions.
          </p>
        </div>

        <Card className="border-border/50 shadow-md">
          <CardContent className="p-6 md:p-10">
            <div 
              {...getRootProps()} 
              className={`
                border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-all duration-300
                ${isDragActive ? 'border-primary bg-primary/5 ring-4 ring-primary/10 scale-[1.01]' : 'border-border/60 bg-secondary/20 hover:bg-secondary/40 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} />
              <div className="w-16 h-16 rounded-full bg-background shadow-sm border flex items-center justify-center mb-6">
                <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">
                {isDragActive ? "Drop documents here..." : "Drag & drop files"}
              </h3>
              <p className="text-muted-foreground max-w-sm mb-6">
                Support for PDF, Markdown (.md), and Text (.txt) files. Maximum file size is 10MB.
              </p>
              <Button type="button" variant="secondary" className="px-8 shadow-sm">
                Browse Files
              </Button>
            </div>
            
            {successStatus && (
              <div className="mt-8 p-4 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded-xl border border-green-200 dark:border-green-900/50 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{successStatus}</span>
              </div>
            )}

            {files.length > 0 && (
              <div className="mt-10">
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Files ready to upload ({files.length})
                </h4>
                <div className="space-y-3 mb-6">
                  {files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-background border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileIcon className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <p className="font-medium text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        disabled={uploadMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end border-t pt-6">
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadMutation.isPending}
                    className="px-8 py-6 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                        Ingesting Documents...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-5 h-5 mr-3" />
                        Upload & Ingest
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
