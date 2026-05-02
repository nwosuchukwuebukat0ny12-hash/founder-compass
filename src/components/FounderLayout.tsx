import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LogOut, LayoutDashboard, FileText, Calendar, 
  User as UserIcon, Target, TrendingUp, BellRing,
  ChevronDown, Building2, Users2, ShieldCheck,
  Briefcase
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const navGroups = [
  {
    label: "Main",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
    ]
  },
  {
    label: "Strategy & Growth",
    items: [
      { title: "Targets & Tasks", url: "/targets", icon: Target },
      { title: "Financials", url: "/financials", icon: TrendingUp },
      { title: "Reporting Hub", url: "/updates", icon: BellRing },
    ]
  },
  {
    label: "Company Hub",
    items: [
      { 
        title: "Company Profile", 
        icon: Building2,
        isGroup: true,
        children: [
          { title: "Fact Sheet", url: "/profile", icon: Briefcase },
          { title: "Team & Ops", url: "/team", icon: Users2 },
          { title: "Document Vault", url: "/documents", icon: ShieldCheck },
        ]
      },
    ]
  },
  {
    label: "Community",
    items: [
      { title: "Events & Calendar", url: "/events", icon: Calendar },
    ]
  }
];

function FounderSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r border-[#878A22]/10 bg-[#F9F6F2]">
      <SidebarHeader className="px-4 py-6">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D395] to-[#878A22] shadow-lg shadow-[#00D395]/20">
              <span className="text-white font-black text-lg">F</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#1A1A1A] tracking-tight leading-none">
                Founder Portal
              </span>
              <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-1">
                Collective Lab
              </span>
            </div>
          </div>
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D395] to-[#878A22] mx-auto shadow-lg shadow-[#00D395]/20">
            <span className="text-white font-black text-lg">F</span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-3 gap-6">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#878A22] mb-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarMenu>
              {group.items.map((item) => (
                item.isGroup ? (
                  <Collapsible key={item.title} defaultOpen className="group/collapsible">
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title} className="text-gray-600 hover:text-[#1A1A1A] hover:bg-white transition-all">
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span>{item.title}</span>
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="border-l border-[#878A22]/20 ml-4 my-1">
                          {item.children?.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton asChild isActive={location.pathname === child.url}>
                                <NavLink
                                  to={child.url}
                                  className="flex items-center gap-3 rounded-md px-3 py-2 text-xs font-medium text-gray-500 transition-all hover:text-[#1A1A1A]"
                                  activeClassName="text-[#00D395] font-bold bg-white"
                                >
                                  <child.icon className="h-3.5 w-3.5 shrink-0" />
                                  <span>{child.title}</span>
                                </NavLink>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-all hover:text-[#1A1A1A] hover:bg-white"
                        activeClassName="bg-white text-[#00D395] font-semibold border-r-2 border-[#00D395] rounded-r-none shadow-sm"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-3 py-6 mt-auto border-t border-[#878A22]/10">
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className="w-full justify-start text-gray-500 hover:text-[#FF4D4F] hover:bg-[#FF4D4F]/5 transition-all"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="ml-3 text-xs font-bold uppercase tracking-widest">Sign Out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

export function FounderLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const userEmail = user?.email || "founder@startup.com";
  const userInitial = userEmail.charAt(0).toUpperCase();

  const { data: profile } = useQuery({
    queryKey: ["founder-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F9F6F2]">
        <FounderSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          
          <header className="h-16 flex items-center justify-between border-b border-[#878A22]/10 px-6 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-500 hover:text-[#1A1A1A] transition-colors" />
              <div className="h-4 w-[1px] bg-gray-200 hidden md:block" />
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.2em] hidden md:block">Mission Control</span>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
                <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-[#1A1A1A] leading-none">{profile?.full_name || "Founder"}</p>
                  <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-tighter">{profile?.role === 'founder' ? 'Founder & CEO' : profile?.role}</p>
                </div>
                <Avatar className="h-8 w-8 border border-gray-100 ring-2 ring-[#00D395]/20">
                  <AvatarFallback className="bg-gradient-to-br from-[#00D395] to-[#878A22] text-white text-xs font-bold">
                    {profile?.full_name ? profile.full_name.split(' ').map(n => n[0]).join('') : 'F'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 overflow-y-auto bg-[#F9F6F2]">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
