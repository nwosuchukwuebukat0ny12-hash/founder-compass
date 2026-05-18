import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  LogOut, LayoutDashboard, FileText, Calendar, 
  User as UserIcon, Target, TrendingUp, BellRing,
  ChevronDown, Building2, Users2, ShieldCheck,
  Briefcase, BarChart3, History, Bell, Check, CheckSquare, Clock, Inbox, AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { NavLink } from "@/components/NavLink";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
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
      { title: "Updates History", url: "/history", icon: History },
      { title: "Custom Metrics", url: "/custom-metrics", icon: BarChart3 },
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

  const queryClient = useQueryClient();

  // 1. Fetch founder notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["founder-notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // 2. Realtime subscription for notifications updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`realtime-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["founder-notifications", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // 3. Mutation: Mark single notification as read
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-notifications", user?.id] });
    }
  });

  // 4. Mutation: Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["founder-notifications", user?.id] });
    }
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

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
              {/* Premium Live Notification Bell Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                    <Bell className="h-5 w-5 text-gray-500 group-hover:text-[#1A1A1A] transition-colors" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF4D4F] text-[9px] font-black text-white ring-2 ring-white animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 sm:w-96 p-0 bg-white/95 backdrop-blur-md border-none rounded-3xl shadow-2xl z-50 mr-4 mt-2">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#F9F6F2]/50 rounded-t-3xl">
                    <div className="flex items-center gap-2">
                      <BellRing className="w-4 h-4 text-[#00D395]" />
                      <span className="font-bold text-sm text-[#1A1A1A]">Inbox Messages</span>
                    </div>
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAllAsRead.mutate()}
                        disabled={markAllAsRead.isPending}
                        className="h-7 text-[10px] font-bold uppercase tracking-wider text-[#00D395] hover:bg-[#00D395]/5 rounded-lg px-2"
                      >
                        <CheckSquare className="w-3 h-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                  </div>

                  {/* Message List */}
                  <ScrollArea className="max-h-[350px] pr-2">
                    <div className="divide-y divide-gray-50">
                      {notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-4 transition-colors flex gap-3.5 items-start ${
                              !n.is_read ? "bg-[#00D395]/5" : "bg-white"
                            }`}
                          >
                            {/* Color-coded severity dot or icon */}
                            <div className={`mt-0.5 p-1.5 rounded-lg border ${
                              n.type === "error" ? "bg-rose-50 border-rose-100 text-rose-500" :
                              n.type === "warning" ? "bg-amber-50 border-amber-100 text-amber-500" :
                              "bg-sky-50 border-sky-100 text-sky-500"
                            }`}>
                              {n.type === "error" ? <AlertCircle className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline gap-2">
                                <span className="font-bold text-xs text-gray-900 truncate">
                                  {n.title}
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase whitespace-nowrap flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed font-medium">
                                {n.message}
                              </p>
                              {!n.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead.mutate(n.id)}
                                  disabled={markAsRead.isPending}
                                  className="h-6 mt-2 text-[9px] font-bold uppercase tracking-wider text-[#00D395] hover:bg-[#00D395]/10 rounded-md px-1.5"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Mark read
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 text-center text-gray-300">
                          <Inbox className="w-10 h-10 mx-auto mb-2 opacity-25" />
                          <p className="text-xs font-bold uppercase tracking-wider">No notifications yet</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-1">You are completely up-to-date.</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>

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
