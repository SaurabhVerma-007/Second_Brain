import { BrainCircuit, Database, MessageSquare, UploadCloud } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Chat", url: "/", icon: MessageSquare },
  { title: "Upload", url: "/upload", icon: UploadCloud },
  { title: "Knowledge Base", url: "/knowledge", icon: Database },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-display font-bold text-base leading-none">Second Brain</span>
          <span className="text-xs text-muted-foreground">RAG Assistant</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className={`
                        transition-all duration-200
                        ${isActive ? 'bg-primary/5 text-primary font-medium' : 'text-foreground hover:bg-secondary'}
                      `}
                    >
                      <Link href={item.url} className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
