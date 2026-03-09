import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  const style = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "4rem",
  } as React.CSSProperties;

  return (
    <SidebarProvider style={style}>
      <div className="flex h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          <header className="flex items-center h-14 px-4 border-b border-border/50 bg-background/95 backdrop-blur z-10 shrink-0">
            <SidebarTrigger className="hover:bg-secondary p-2 rounded-md transition-colors" />
          </header>
          <main className="flex-1 overflow-y-auto relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
