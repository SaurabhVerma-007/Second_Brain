import { useState, useRef, useEffect } from "react";
import { Send, User, Bot, Loader2, Link as LinkIcon, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChatQuery } from "@/hooks/use-chat";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { filename: string; content: string }[];
  isError?: boolean;
};

export default function Chat() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your Second Brain assistant. Ask me anything based on the documents you've uploaded to your knowledge base."
    }
  ]);
  
  const chatMutation = useChatQuery();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMutation.isPending]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || chatMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: query.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuery("");

    try {
      const response = await chatMutation.mutateAsync(userMessage.content);
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };
      
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm sorry, I encountered an error while searching your knowledge base.",
        isError: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Layout>
      <div className="flex flex-col h-full max-w-5xl mx-auto">
        <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollRef}>
          <div className="flex flex-col space-y-8 pb-24">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <Avatar className={`w-10 h-10 shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-secondary border border-border'}`}>
                  <AvatarFallback className={msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-foreground'}>
                    {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`
                      px-5 py-4 rounded-2xl text-sm md:text-base shadow-sm
                      ${msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : msg.isError 
                          ? 'bg-destructive/10 text-destructive border border-destructive/20 rounded-tl-sm'
                          : 'bg-card border border-border rounded-tl-sm'
                      }
                    `}
                  >
                    {msg.isError && <AlertCircle className="w-5 h-5 mb-2" />}
                    {msg.role === 'assistant' ? (
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words"
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                  
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="w-full mt-2 bg-secondary/30 rounded-xl border border-border overflow-hidden">
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="sources" className="border-none">
                          <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/50 text-sm font-medium text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <LinkIcon className="w-4 h-4" />
                              View Sources ({msg.sources.length})
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 pb-4">
                            <div className="space-y-4 mt-2">
                              {msg.sources.map((source, idx) => (
                                <div key={idx} className="bg-background rounded-lg p-3 border border-border/50 shadow-sm">
                                  <div className="text-xs font-semibold text-primary mb-1 border-b border-border/50 pb-1 inline-block">
                                    {source.filename}
                                  </div>
                                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                                    "{source.content}..."
                                  </p>
                                </div>
                              ))}
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {chatMutation.isPending && (
              <div className="flex gap-4 max-w-4xl">
                <Avatar className="w-10 h-10 shrink-0 bg-secondary border border-border">
                  <AvatarFallback className="bg-transparent text-foreground">
                    <Bot className="w-5 h-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center px-5 py-4 rounded-2xl bg-card border border-border rounded-tl-sm text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin mr-3" />
                  <span className="text-sm animate-pulse">Searching knowledge base...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/95 to-transparent pt-12">
          <form 
            onSubmit={handleSubmit}
            className="max-w-4xl mx-auto relative flex items-end gap-2 bg-card border-2 border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all duration-300 rounded-2xl shadow-lg shadow-black/5 p-2"
          >
            <Textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your documents..."
              className="min-h-[60px] max-h-[200px] resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-base py-3 px-4"
              rows={1}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!query.trim() || chatMutation.isPending}
              className="shrink-0 h-12 w-12 rounded-xl mb-1 mr-1 transition-transform active:scale-95"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <div className="text-center mt-3 text-xs text-muted-foreground">
            Second Brain RAG can make mistakes. Verify important information.
          </div>
        </div>
      </div>
    </Layout>
  );
}
