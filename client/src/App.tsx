import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// Pages
import Chat from "@/pages/chat";
import Upload from "@/pages/upload";
import KnowledgeBase from "@/pages/knowledge-base";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Chat} />
      <Route path="/upload" component={Upload} />
      <Route path="/knowledge" component={KnowledgeBase} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
