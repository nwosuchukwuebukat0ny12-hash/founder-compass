import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useLocation } from "react-router-dom";
import { ChevronRight, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  
  // Basic breadcrumb generation based on path
  const pathnames = location.pathname.split("/").filter((x) => x);
  
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* Top Navigation Bar */}
          <header className="h-16 flex items-center justify-between border-b px-6 bg-card sticky top-0 z-10 shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
              
              {/* Breadcrumbs */}
              <div className="hidden sm:flex items-center text-sm font-medium text-muted-foreground">
                <span className="capitalize">Founder Pulse</span>
                {pathnames.length > 0 && (
                  <>
                    <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
                    <span className="capitalize text-foreground font-semibold">
                      {pathnames[0].replace("-", " ")}
                    </span>
                  </>
                )}
                {pathnames.length > 1 && (
                  <>
                    <ChevronRight className="h-4 w-4 mx-2 opacity-50" />
                    <span className="capitalize text-foreground">
                      Detail View
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-5">
              <button className="text-muted-foreground hover:text-foreground transition-colors relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive"></span>
              </button>
              
              <div className="flex items-center gap-3 pl-5 border-l">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium leading-none">Lab Admin</p>
                  <p className="text-xs text-muted-foreground mt-1">admin@collectivelab.com</p>
                </div>
                <Avatar className="h-9 w-9 border-2 border-primary/10">
                  <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                    LA
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
