import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, Upload, FileText, Loader2, Target, Zap, Rocket, 
  LineChart, Users, Megaphone, CheckCircle2, Calendar, Download, 
  Crosshair, Flame, MessageSquare, ArrowUpRight, ArrowDownRight, 
  AlertCircle, Plus, LayoutDashboard, Filter, MoreVertical, 
  TrendingUp, TrendingDown, Calculator, Globe, Sparkles, Shield, 
  ShieldCheck, Wallet, Activity, Linkedin, UserPlus, Workflow, 
  Building2, Users2, Briefcase, ExternalLink, ChevronRight,
  TrendingUp as TrendingUpIcon, DollarSign, PieChart as PieChartIcon, 
  Clock, Ghost, Search, Share2, Mail, Phone, MapPin, Twitter, 
  Instagram, Github, Linkedin as LinkedinIcon, Link as LinkIcon, ArrowRight, RefreshCw,
  Trophy, AlertTriangle, HelpCircle, Banknote, Flag, Star, Eye, Send
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell, 
  LineChart as RechartsLineChart, Line 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { GrowthStageBar, type GrowthStage } from "@/components/GrowthStageBar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tables } from "@/integrations/supabase/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";



export default function StartupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [burnTimeframe, setBurnTimeframe] = useState<"daily" | "weekly" | "monthly">("monthly");
  // Assessment dialog state
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);
  const [assessmentTarget, setAssessmentTarget] = useState<any>(null);
  const [assessmentRating, setAssessmentRating] = useState<"On Track" | "Needs Attention" | "Critical Risk">("On Track");
  const [assessmentText, setAssessmentText] = useState("");
  // Milestone review dialog state
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<any>(null);
  const [reviewProgress, setReviewProgress] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");

  // --- DATA FETCHING (Moved to top to prevent 'used before declaration' errors) ---
  const { data: startup, isLoading: loadingStartup } = useQuery({
    queryKey: ["startup", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const currencySymbol = useMemo(() => {
    if (!startup) return '$';
    return startup.currency === 'NGN' ? '₦' : startup.currency === 'GBP' ? '£' : startup.currency === 'EUR' ? '€' : '$';
  }, [startup]);

  const { data: pulses = [] } = useQuery({
    queryKey: ["startup-pulses", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").eq("startup_id", id!).order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: milestones = [] } = useQuery({
    queryKey: ["milestones", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("milestones").select("*").eq("startup_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ["startup-team", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("team_members").select("*").eq("startup_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ["attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("event_attendees").select("*, events(*)").eq("startup_id", id!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: founderUpdates = [] } = useQuery({
    queryKey: ["founder-updates", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("startup_updates")
        .select("id, title, content, created_at")
        .eq("startup_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });
  
  const { data: financials = [] } = useQuery({
    queryKey: ["startup-financials-transactions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, date")
        .eq("startup_id", id!)
        .order("date", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("*").eq("startup_id", id!).order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const { data: notes = [], refetch: refetchNotes } = useQuery({
    queryKey: ["notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select(`id, content, created_at, is_private, startup_id, author_id, profiles:author_id(full_name)`)
        .eq("startup_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!id,
  });

  const [noteText, setNoteText] = useState("");
  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteText.trim()) return;
      const { error } = await supabase.from("notes").insert({
        content: noteText,
        startup_id: id!,
        author_id: user?.id,
        is_private: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText("");
      refetchNotes();
      toast({ title: "Note saved", description: "Your interaction log has been updated." });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Update milestone (admin review)
  const updateMilestone = useMutation({
    mutationFn: async ({ milestoneId, updates }: { milestoneId: string; updates: { status?: string; current_value?: number; progress?: number } }) => {
      const { error } = await supabase.from("milestones").update(updates).eq("id", milestoneId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", id] });
      setIsReviewOpen(false);
      setReviewTarget(null);
      toast({ title: "Target updated", description: "Milestone status has been synced." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Save advisor assessment as a structured note
  const addAssessment = useMutation({
    mutationFn: async () => {
      if (!assessmentText.trim()) throw new Error("Please write an assessment note.");
      const targetLabel = assessmentTarget ? ` [Target: ${assessmentTarget.title}]` : "";
      const content = `🎯 [Target Assessment] [${assessmentRating}]${targetLabel}\n\n${assessmentText.trim()}`;
      const { error } = await supabase.from("notes").insert({
        content,
        startup_id: id!,
        author_id: user?.id,
        is_private: false
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setIsAssessmentOpen(false);
      setAssessmentText("");
      setAssessmentRating("On Track");
      setAssessmentTarget(null);
      refetchNotes();
      toast({ title: "Assessment logged", description: "Advisory assessment saved to the timeline." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Custom Nudge states
  const [isNudgeOpen, setIsNudgeOpen] = useState(false);
  const [nudgeMessage, setNudgeMessage] = useState("");
  const [nudgeType, setNudgeType] = useState<"warning" | "error" | "info">("warning");

  const sendNudge = useMutation({
    mutationFn: async ({ message, type }: { message: string; type: "warning" | "error" | "info" }) => {
      let targetUserId = startup?.founder_id;
      if (!targetUserId) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("startup_id", id!)
          .limit(1);
        if (profiles && profiles.length > 0) {
          targetUserId = profiles[0].id;
        }
      }

      const titleEmoji = type === "error" ? "🚨 Lab Urgent Alert" : type === "warning" ? "⚠️ Lab Warning Alert" : "ℹ️ Lab Info Alert";

      if (targetUserId) {
        const { error } = await supabase.from("notifications").insert({
          user_id: targetUserId,
          title: titleEmoji,
          message: message.trim(),
          type: type === "error" ? "error" : type === "warning" ? "warning" : "info",
        });
        if (error) throw error;
        return { isDemo: false };
      } else {
        const { error } = await supabase.from("notes").insert({
          content: `🎯 [System Log] Sent accountability nudge to founder ${startup?.founder_name || "David Chen"}.\n\n[Severity: ${type.toUpperCase()}]\nMessage: "${message.trim()}"`,
          startup_id: id!,
          author_id: user?.id,
          is_private: false
        });
        if (error) throw error;
        return { isDemo: true };
      }
    },
    onSuccess: (data) => {
      refetchNotes();
      setIsNudgeOpen(false);
      if (data.isDemo) {
        toast({
          title: "Message Sent! ⚡ (Demo Mode)",
          description: `Simulated alert sent to founder ${startup?.founder_name || "David Chen"} with your message.`,
        });
      } else {
        toast({
          title: "Message Sent! ⚡",
          description: `Alerted founder with your message.`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const openReviewDialog = (target: any) => {
    setReviewTarget(target);
    setReviewProgress(String(target.current_value || 0));
    setReviewStatus(target.status || "Active");
    setIsReviewOpen(true);
  };

  const handleReviewSave = () => {
    if (!reviewTarget) return;
    const val = parseFloat(reviewProgress);
    const updates: { status?: string; current_value?: number; progress?: number } = { status: reviewStatus };
    if (!isNaN(val)) {
      updates.current_value = val;
      if (reviewTarget.target_value && reviewTarget.target_value > 0) {
        updates.progress = Math.min(Math.round((val / reviewTarget.target_value) * 100), 100);
      }
    }
    updateMilestone.mutate({ milestoneId: reviewTarget.id, updates });
  };





  const cycleBurnTimeframe = () => {
    const next: Record<string, "daily" | "weekly" | "monthly"> = { daily: "weekly", weekly: "monthly", monthly: "daily" };
    setBurnTimeframe(next[burnTimeframe]);
  };

  // --- ANALYTICS ENGINE ---
  const reportingRate = useMemo(() => {
    // Logic: Last 4 weeks. A week is reported if pulses or milestones were updated.
    const weeks = [0, 1, 2, 3];
    const now = new Date();
    const reportedWeeks = weeks.filter(weekOffset => {
      const weekStart = new Date(now.getTime() - (weekOffset + 1) * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);
      
      const hasPulse = pulses.some(p => {
        const d = new Date(p.created_at || p.month);
        return d >= weekStart && d < weekEnd;
      });
      
      const hasMilestone = milestones.some(m => {
        const d = new Date(m.updated_at || m.created_at || '');
        return d >= weekStart && d < weekEnd;
      });

      return hasPulse || hasMilestone;
    });

    return Math.round((reportedWeeks.length / 4) * 100);
  }, [pulses, milestones]);

  const insights = useMemo(() => {
    if (pulses.length < 1) return null;
    const current = pulses[pulses.length - 1];
    const previous = pulses[pulses.length - 2] || null;
    
    // Dynamic Burn from Transactions (Grouped by Month)
    const monthlyGroups: Record<string, number> = {};
    financials.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.slice(0, 7);
      if (tx.type === 'expense') {
        monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + (tx.amount || 0);
      }
    });

    const monthValues = Object.values(monthlyGroups).slice(-3);
    const avgMonthlyBurn = monthValues.length > 0 
      ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length
      : current.expenses || 0;

    // Burn Velocity (MoM change in avg monthly burn)
    const sortedMonths = Object.keys(monthlyGroups).sort();
    const latestMonthBurn = monthlyGroups[sortedMonths[sortedMonths.length - 1]] || 0;
    const prevMonthBurn = monthlyGroups[sortedMonths[sortedMonths.length - 2]] || 0;
    const burnVelocity = prevMonthBurn > 0 ? (latestMonthBurn - prevMonthBurn) / prevMonthBurn : 0;

    const revenue = current.mrr || 0;
    const expenses = latestMonthBurn || current.expenses || 0;
    const netMargin = revenue > 0 ? (revenue - expenses) / revenue : -1;
    const newRev = previous ? Math.max(0, (current.mrr || 0) - (previous.mrr || 0)) : 0;
    const efficiency = newRev > 0 ? (expenses - revenue) / newRev : 0;
    
    // Adjusted Live Cash = Pulse Cash + All Transactions since that Pulse
    const pulseDate = new Date(current.month + '-01');
    const relevantTxs = financials.filter(tx => tx.date && new Date(tx.date) >= pulseDate);
    
    let incomeDelta = 0;
    let expenseDelta = 0;
    relevantTxs.forEach(tx => {
      if (tx.type === 'income') incomeDelta += (tx.amount || 0);
      if (tx.type === 'expense') expenseDelta += (tx.amount || 0);
    });
    
    const pulseCash = current.cash_in_bank || 0;
    const cash = pulseCash + incomeDelta - expenseDelta;
    const netBurn = Math.max(0, expenses - revenue);
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    let burnThresholdTime = startOfToday;
    if (burnTimeframe === "weekly") {
      burnThresholdTime = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (burnTimeframe === "monthly") {
      burnThresholdTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    const totalBurn = financials
      .filter(tx => tx.type === 'expense' && tx.date && new Date(tx.date).getTime() >= burnThresholdTime)
      .reduce((sum, tx) => sum + (tx.amount || 0), 0);

    const runway = avgMonthlyBurn > 0 ? cash / avgMonthlyBurn : 0;
    
    return { 
      burnVelocity, netMargin, efficiency, runway, current, previous, netBurn, totalBurn,
      pulseCash, incomeDelta, expenseDelta, cash
    };
  }, [pulses, financials, burnTimeframe]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "k";
    return val.toLocaleString();
  };

  const chartData = useMemo(() => {
    const now = new Date();
    
    const formatLocalYearMonth = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      return `${yyyy}-${mm}`;
    };

    const currentMonthKey = formatLocalYearMonth(now);
    
    // 1. Get unique months from last 6 months
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(formatLocalYearMonth(d));
    }

    return months.map(m => {
      const pulse = pulses.find(p => p.month === m);
      const isCurrentMonth = m === currentMonthKey;
      
      let expenses = pulse?.expenses || 0;
      let revenue = pulse?.mrr || 0;

      if (isCurrentMonth) {
        // Use live transactions for current month burn
        expenses = financials
          .filter(tx => tx.date && tx.date.startsWith(m) && tx.type === 'expense')
          .reduce((sum, tx) => sum + (tx.amount || 0), 0);
        
        // If no pulse yet for this month, use the latest known MRR
        if (!pulse && pulses.length > 0) {
          revenue = pulses[pulses.length - 1].mrr || 0;
        }
      }

      return {
        month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' }),
        mrr: revenue,
        expenses: expenses,
        target: pulse?.target_mrr || 0,
        isLive: isCurrentMonth
      };
    });
  }, [pulses, financials]);

  const isMockMode = false;

  if (loadingStartup) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!startup) return <div className="p-8 text-center text-red-500">Startup not found.</div>;

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 px-6 py-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-5 w-full md:w-auto">
            <Button variant="ghost" size="icon" onClick={() => navigate('/startups')} className="rounded-full hover:bg-gray-100 shrink-0 self-start md:self-center">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex flex-col md:flex-row items-center gap-5 w-full">
              <Avatar className="h-20 w-20 md:h-16 md:w-16 border-2 border-gray-50 shadow-sm shrink-0">
                <AvatarImage src={startup.logo_url || ''} />
                <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                  {startup.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-2">
                  <h1 className="text-2xl font-bold tracking-tight">{startup.name}</h1>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-3">
                    Live Portfolio
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  Founder: {startup.founder_name} · {startup.industry || 'Tech'} · {startup.current_stage || 'Early'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 gap-2">
                <Share2 className="w-4 h-4" /> Share
              </Button>
              <Button 
                onClick={() => {
                  setNudgeMessage(`Hi ${startup?.founder_name || "there"}! The Collective Lab team has reviewed your target board for ${startup?.name}. Please ensure all active milestones, operational focus checklists, and pulse updates are completely up-to-date.`);
                  setNudgeType("warning");
                  setIsNudgeOpen(true);
                }}
                className="rounded-xl bg-[#635BFF] hover:bg-[#5249cf] text-white gap-2 shadow-sm min-w-[120px] justify-center"
              >
                <MessageSquare className="w-4 h-4" />
                Send Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* TABS NAVBAR - Updated for Mobile Scroll */}
          <div className="overflow-x-auto no-scrollbar -mx-6 px-6 mb-8 border-b border-gray-100">
            <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start w-max rounded-none">
              {[
                { value: 'overview', label: 'Overview', icon: LayoutDashboard },
                { value: 'financials', label: 'Financials', icon: LineChart },
                { value: 'targets', label: 'Targets', icon: Target },
                { value: 'events', label: 'Events', icon: Calendar },
                { value: 'updates', label: 'Updates', icon: Zap },
                { value: 'notes', label: 'Admin Notes', icon: AlertCircle },
                { value: 'vault', label: 'Vault', icon: ShieldCheck },
              ].map(tab => (
                <TabsTrigger 
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary px-1 pb-4 text-sm font-bold text-gray-400 hover:text-gray-600 transition-all gap-2 flex-shrink-0"
                >
                  <tab.icon className="w-4 h-4" /> {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* TAB CONTENTS */}
          
          {/* 1. OVERVIEW */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* KPI GRID */}
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Monthly Revenue
                    <DollarSign className="w-3 h-3 text-[#635BFF]" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{formatCurrency(insights?.current?.mrr || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-500 flex items-center mt-1">
                    Current MRR
                  </div>
                </CardContent>
              </Card>
              
              <Card 
                className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden cursor-pointer hover:ring-1 ring-red-100 transition-all group"
                onClick={cycleBurnTimeframe}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <span>Portfolio Burn</span>
                      <div className="flex items-center gap-1 text-[9px] text-red-500 lowercase">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" /> {burnTimeframe}
                      </div>
                    </div>
                    <Flame className="w-3 h-3 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {currencySymbol}{formatCurrency(insights?.totalBurn || 0)}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                    Total logged {burnTimeframe} burn
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Runway
                    <Clock className="w-3 h-3 text-amber-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {`${insights?.runway?.toFixed(1) || '0.0'}mo`}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 flex items-center mt-1">
                    {insights?.runway === 0 ? 'No active burn' : 'Based on avg monthly burn'}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white rounded-2xl overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between">
                    Reporting Rate
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{reportingRate}%</div>
                  <div className="mt-2 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${reportingRate}%` }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              {/* LEFT COLUMN: Vision & Key Contacts */}
              <div className="lg:col-span-2 space-y-8">
                {/* Vision Section */}
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Rocket className="w-5 h-5 text-primary" /> The Vision
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Elevator Pitch</p>
                      <p className="text-xl font-medium text-gray-900 leading-tight">
                        {startup.mission_statement || 'A bold vision for the future of this industry.'}
                      </p>
                    </div>
                    <Separator className="bg-gray-50" />
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Core Description</p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {startup.description || 'No detailed description provided yet.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Key Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-lg font-bold">Key Contacts</h3>
                    <Badge variant="outline" className="rounded-full bg-gray-50 text-gray-500 border-none font-bold text-[10px]">
                      {teamMembers.length} Members
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {teamMembers.map((member: any) => (
                      <Card key={member.id} className="border border-gray-100 shadow-sm rounded-2xl hover:border-primary/20 transition-all bg-white group">
                        <CardContent className="p-5">
                          <div className="flex items-center gap-4">
                            <Avatar className="h-14 w-14 rounded-xl border-2 border-gray-50 group-hover:border-primary/10 transition-all">
                              <AvatarImage src={member.avatar_url || ''} />
                              <AvatarFallback className="bg-primary/5 text-primary font-bold">{member.full_name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-bold text-gray-900 truncate">{member.full_name}</h4>
                              <p className="text-[11px] text-primary font-bold uppercase tracking-tight">{member.role}</p>
                            </div>
                          </div>
                          <div className="mt-5 pt-5 border-t border-gray-50 space-y-2">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span className="truncate">{member.email || 'No email set'}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{member.phone_number || 'No phone set'}</span>
                            </div>
                            {member.linkedin && (
                              <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-[#0A66C2] font-medium hover:underline">
                                <LinkedinIcon className="w-3.5 h-3.5" />
                                <span>LinkedIn Profile</span>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="col-span-full py-12 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100">
                        <Users2 className="h-8 w-8 mx-auto mb-3 text-gray-200" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No team members listed</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Trajectory & Milestones */}
              <div className="space-y-8">
                <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Revenue vs Target Projection</CardTitle>
                    <CardDescription>MRR Growth vs Planned Roadmap</CardDescription>
                  </CardHeader>
                  <CardContent className="h-[240px] px-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => `${currencySymbol}${val / 1000}k`} />
                        <RechartsTooltip 
                          cursor={{ fill: 'rgba(99, 91, 255, 0.05)' }} 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} 
                        />
                        <Bar 
                          dataKey="mrr" 
                          name="Actual MRR"
                          fill="#00D395" 
                          radius={[6, 6, 0, 0]} 
                          barSize={20} 
                        />
                        <Bar 
                          dataKey="target" 
                          name="Target Projection"
                          fill="#635BFF" 
                          radius={[6, 6, 0, 0]} 
                          barSize={20} 
                          opacity={0.3}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Execution Board</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {milestones.slice(0, 4).map(m => (
                      <div key={m.id} className="flex items-center justify-between p-4 rounded-2xl border border-gray-100 bg-white hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {m.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                          </div>
                          <p className="text-xs font-bold text-gray-900 truncate max-w-[120px]">{m.title}</p>
                        </div>
                        <Badge variant="outline" className={`text-[9px] font-bold uppercase border-none ${m.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
                          {m.status}
                        </Badge>
                      </div>
                    ))}
                    {milestones.length === 0 && <p className="text-center py-8 text-[10px] font-bold text-gray-300 uppercase tracking-widest">No milestones logged</p>}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>


          {/* 3. FINANCIALS */}
          <TabsContent value="financials" className="mt-0 space-y-8">
            {/* Reconciliation Bridge */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden group">
                <div className="absolute left-0 top-0 w-1 h-full bg-gray-400 opacity-20" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pulse Baseline</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-gray-900">{currencySymbol}{formatCurrency(insights?.pulseCash || 0)}</p>
                  <p className="text-[10px] text-gray-400 font-medium">As of {insights?.current?.month}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden group">
                <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400 opacity-40" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Ledger Income</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-emerald-600">+{currencySymbol}{formatCurrency(insights?.incomeDelta || 0)}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Since last pulse</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-none shadow-sm rounded-2xl overflow-hidden group">
                <div className="absolute left-0 top-0 w-1 h-full bg-red-400 opacity-40" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Ledger Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-red-600">-{currencySymbol}{formatCurrency(insights?.expenseDelta || 0)}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Since last pulse</p>
                </CardContent>
              </Card>
              <Card className="bg-[#1A1A1A] border-none shadow-lg rounded-2xl overflow-hidden relative">
                <div className="absolute right-0 bottom-0 p-2 opacity-5"><Banknote className="w-12 h-12 text-white" /></div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Adjusted Live Cash</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xl font-bold text-white">{currencySymbol}{formatCurrency(insights?.cash || 0)}</p>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-tighter flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Sync Perfect
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-3">
              {/* Admin Intelligence Card */}
              <Card className="lg:col-span-3 border-none shadow-[0_20px_50px_rgba(99,91,255,0.08)] bg-[#635BFF] text-white rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Calculator className="w-32 h-32" /></div>
                <CardHeader>
                  <CardTitle className="text-white/80 text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Admin Intelligence
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-8 grid-cols-1 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Burn Velocity</p>
                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold">{(insights?.burnVelocity || 0) > 0 ? '+' : ''}{((insights?.burnVelocity || 0) * 100).toFixed(1)}%</p>
                        <Badge className={`mb-1 border-none ${insights?.burnVelocity && insights.burnVelocity > 0.1 ? 'bg-red-500/20 text-red-200' : 'bg-emerald-500/20 text-emerald-200'}`}>
                          {insights?.burnVelocity && insights.burnVelocity > 0.1 ? 'High Burn' : 'Stable'}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-white/40">MoM change in monthly expenses</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Net Margin</p>
                      <p className="text-3xl font-bold">{((insights?.netMargin || 0) * 100).toFixed(1)}%</p>
                      <p className="text-[10px] text-white/40">Profitability ratio per dollar earned</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-white/60 text-xs font-medium">Growth Efficiency</p>
                      <p className="text-3xl font-bold">{currencySymbol}{(insights?.efficiency || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-white/40">Burn required to acquire {currencySymbol}1 of new MRR</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">Financial Trajectory</CardTitle>
                    <CardDescription>Pulses + Real-time Ledger Burn</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#635BFF]" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">MRR</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Burn</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 10, fontWeight: 'bold'}} />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(99, 91, 255, 0.05)' }} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                      />
                      <Bar dataKey="mrr" fill="#635BFF" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="expenses" fill="#F43F5E" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg font-bold">Recent Ledger</CardTitle>
                  <CardDescription>Live transactions since pulse</CardDescription>
                </CardHeader>
                <CardContent>
                   <ScrollArea className="h-[350px] pr-4">
                     <div className="space-y-3">
                        {[...financials].reverse().slice(0, 15).map((tx) => (
                          <div key={tx.id} className="p-3 rounded-xl border border-gray-50 bg-gray-50/30 flex justify-between items-center group hover:bg-white hover:border-gray-100 transition-all">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {tx.type === 'income' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{tx.date ? new Date(tx.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}</p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">{tx.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-black tabular-nums ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {tx.type === 'income' ? '+' : '-'}{currencySymbol}{formatCurrency(tx.amount || 0)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {financials.length === 0 && <p className="text-center text-sm text-gray-400 py-12">No transactions recorded.</p>}
                     </div>
                   </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 4. TARGETS */}
          <TabsContent value="targets" className="mt-0 space-y-6">
            {/* Header Action Bar */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Execution Board</h2>
                <p className="text-xs text-gray-400 font-medium">Live founder targets & advisor assessments</p>
              </div>
              <Button
                onClick={() => { setAssessmentTarget(null); setIsAssessmentOpen(true); }}
                className="bg-[#635BFF] hover:bg-[#4F46E5] text-white rounded-full h-9 px-4 text-xs font-bold shadow-sm gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> Add Advisor Assessment
              </Button>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              {/* LEFT: Strategic Targets + Tasks */}
              <div className="lg:col-span-2 space-y-6">
                {/* Strategic Targets */}
                {(() => {
                  const targets = milestones.filter(m => m.type === 'target');
                  return (
                    <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                      <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Target className="w-4 h-4 text-[#635BFF]" /> Strategic Targets
                          </CardTitle>
                          <CardDescription>Founder-set goals with progress tracking</CardDescription>
                        </div>
                        <Badge className="bg-[#635BFF]/10 text-[#635BFF] border-none font-bold">{targets.length}</Badge>
                      </CardHeader>
                      <CardContent>
                        {targets.length === 0 ? (
                          <div className="text-center py-10">
                            <Target className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                            <p className="text-sm font-bold text-gray-400">No strategic targets set yet</p>
                            <p className="text-xs text-gray-300 mt-1">Encourage the founder to set goals in their portal.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {targets.map(t => (
                              <div key={t.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/30 hover:bg-white hover:border-[#635BFF]/20 transition-all group">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      {t.is_pinned && <Flag className="w-3 h-3 text-[#635BFF] fill-current flex-shrink-0" />}
                                      <p className="text-sm font-bold text-gray-900 truncate">{t.title}</p>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                      {t.category && <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>}
                                      {t.deadline && <span className="text-[9px] text-gray-400 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />Due {new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>}
                                    </div>
                                    {t.target_value ? (
                                      <div>
                                        <div className="flex items-center justify-between mb-1">
                                          <span className="text-[10px] text-gray-500 font-medium">{t.current_value || 0} / {t.target_value}</span>
                                          <span className="text-[10px] font-bold text-[#635BFF]">{t.progress || 0}%</span>
                                        </div>
                                        <Progress value={t.progress || 0} className="h-1.5" />
                                      </div>
                                    ) : (
                                      <Progress value={t.progress || 0} className="h-1.5" />
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                    <Badge className={`text-[9px] font-bold border-none ${
                                      t.status === 'Achieved' || t.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                      t.status === 'Delayed' ? 'bg-red-50 text-red-600' :
                                      'bg-blue-50 text-blue-700'
                                    }`}>{t.status || 'Active'}</Badge>
                                    <Button variant="ghost" size="sm" onClick={() => openReviewDialog(t)}
                                      className="h-7 text-[10px] text-[#635BFF] hover:bg-[#635BFF]/10 font-bold rounded-full px-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Eye className="w-3 h-3 mr-1" /> Review
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Action Tasks */}
                {(() => {
                  const tasks = milestones.filter(m => m.type === 'task');
                  if (tasks.length === 0) return null;
                  return (
                    <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Founder Focus Tasks
                        </CardTitle>
                        <CardDescription>Daily operational actions logged by the founder</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {tasks.map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all">
                              <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${t.status === 'Done' ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                {t.status === 'Done' && <CheckCircle2 className="w-3 h-3 text-white" />}
                              </div>
                              <p className={`text-sm font-medium flex-1 ${t.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{t.title}</p>
                              {t.priority === 'High' && <Flag className="w-3 h-3 text-red-400 fill-current flex-shrink-0" />}
                              <Badge className={`text-[9px] border-none font-bold ${t.status === 'Done' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{t.status || 'Today'}</Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Advisor Assessments Timeline */}
                {(() => {
                  const assessments = notes.filter(n => n.content?.startsWith('🎯 [Target Assessment]'));
                  if (assessments.length === 0) return (
                    <div className="p-6 rounded-3xl border border-dashed border-gray-200 text-center">
                      <Star className="w-6 h-6 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm font-bold text-gray-400">No advisor assessments yet</p>
                      <p className="text-xs text-gray-300 mt-1">Click "Add Advisor Assessment" to log your first review.</p>
                    </div>
                  );
                  return (
                    <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#635BFF]" /> Advisor Assessment Timeline
                        </CardTitle>
                        <CardDescription>Official Collective Lab evaluations</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {assessments.map(note => {
                            const lines = note.content?.split('\n\n') || [];
                            const headerLine = lines[0] || '';
                            const body = lines.slice(1).join('\n\n');
                            const ratingMatch = headerLine.match(/\[([^\]]+)\]/g) || [];
                            const rating = ratingMatch[1]?.replace(/[\[\]]/g, '') || 'On Track';
                            const targetMatch = headerLine.match(/\[Target: ([^\]]+)\]/);
                            const targetName = targetMatch?.[1] || null;
                            const ratingColor = rating === 'On Track' ? 'bg-emerald-50 text-emerald-700' : rating === 'Needs Attention' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600';
                            const authorName = (note as any).profiles?.full_name || 'Lab Advisor';
                            return (
                              <div key={note.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100">
                                <div className="flex items-start gap-3">
                                  <Avatar className="h-8 w-8 flex-shrink-0">
                                    <AvatarImage src={(note as any).profiles?.avatar_url || ''} />
                                    <AvatarFallback className="bg-[#635BFF]/10 text-[#635BFF] text-xs font-bold">{authorName.substring(0,2).toUpperCase()}</AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-gray-900">{authorName}</p>
                                        <Badge className={`text-[9px] font-bold border-none ${ratingColor}`}>{rating}</Badge>
                                        {targetName && <span className="text-[9px] text-gray-400 font-medium truncate">re: {targetName}</span>}
                                      </div>
                                      <span className="text-[9px] text-gray-300 font-medium flex-shrink-0">{new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">{body}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>

              {/* RIGHT: Pinned Target Spotlight */}
              <div className="space-y-6">
                {(() => {
                  const pinned = milestones.filter(m => m.type === 'target').find(t => t.is_pinned || t.priority === 'High');
                  if (!pinned) return (
                    <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
                      <CardContent className="pt-8 pb-8 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                          <Flag className="w-7 h-7 text-gray-200" />
                        </div>
                        <h4 className="text-sm font-bold text-gray-900 mb-1">No Pinned Target</h4>
                        <p className="text-xs text-gray-400 px-4">Ask the founder to pin their priority target in the portal.</p>
                      </CardContent>
                    </Card>
                  );
                  return (
                    <Card className="border-none shadow-lg rounded-3xl overflow-hidden bg-[#1A1A1A] text-white relative">
                      <div className="absolute top-0 right-0 p-6 opacity-5"><Rocket className="w-24 h-24" /></div>
                      <CardHeader>
                        <CardTitle className="text-[10px] font-bold text-white/40 uppercase tracking-widest flex items-center gap-2">
                          <Flag className="w-3 h-3 text-[#635BFF] fill-current" /> Priority Spotlight
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-lg font-black leading-tight">{pinned.title}</p>
                          {pinned.category && <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">{pinned.category}</p>}
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-white/40 font-bold uppercase">Progress</span>
                            <span className="text-xl font-black text-[#635BFF]">{pinned.progress || 0}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-2">
                            <div className="h-2 rounded-full bg-[#635BFF] transition-all duration-500" style={{ width: `${pinned.progress || 0}%` }} />
                          </div>
                        </div>
                        {pinned.target_value && (
                          <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-white/40 uppercase font-bold">Current</span>
                              <span className="text-[9px] text-white/40 uppercase font-bold">Goal</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-base font-black">{pinned.current_value || 0}</span>
                              <span className="text-base font-black text-[#635BFF]">{pinned.target_value}</span>
                            </div>
                          </div>
                        )}
                        {pinned.deadline && (
                          <p className="text-[10px] text-white/30 flex items-center gap-1.5 font-medium">
                            <Calendar className="w-3 h-3" /> Due {new Date(pinned.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </p>
                        )}
                        <Button onClick={() => openReviewDialog(pinned)} className="w-full bg-[#635BFF] hover:bg-[#4F46E5] text-white rounded-2xl h-10 text-xs font-bold">
                          <Eye className="w-3.5 h-3.5 mr-2" /> Review This Target
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          {/* 5. EVENTS */}
          <TabsContent value="events" className="mt-0">
            <Card className="border-none shadow-sm bg-white rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Community Attendance</CardTitle>
                <CardDescription>History of Lab events participated in</CardDescription>
              </CardHeader>
              <CardContent>
                {attendance.length > 0 ? (
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {attendance.map(att => (
                      <div key={att.id} className="p-4 rounded-xl border border-gray-100 flex items-center gap-4 hover:border-primary/20 transition-all cursor-pointer">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                          <Calendar className="w-6 h-6 text-primary" />
                        </div>
                        <div className="min-w-0">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          <p className="text-sm font-bold truncate">{(att.events as any)?.title || 'Community Event'}</p>
                          <p className="text-[10px] text-gray-400">
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {new Date((att.events as any)?.event_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No event attendance records found.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* 7. UPDATES */}
          <TabsContent value="updates" className="mt-0">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Founder Updates</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Real-time wins, blockers and asks from the founder.</p>
                </div>
                <Badge variant="outline" className="font-bold text-xs">
                  {founderUpdates.length} update{founderUpdates.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              {founderUpdates.length === 0 && (
                <div className="py-20 text-center">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="text-sm text-gray-400 italic">No updates posted yet.</p>
                </div>
              )}

              {founderUpdates.map((update) => {
                const titleLower = update.title?.toLowerCase() || "win";
                const isWin = titleLower.includes("win") || titleLower.includes("victory");
                const isBlocker = titleLower.includes("blocker") || titleLower.includes("stuck") || titleLower.includes("stop");
                const isAsk = titleLower.includes("ask") || titleLower.includes("help") || titleLower.includes("request");
                
                let sColor = "emerald";
                let label = "STRATEGIC WIN";
                let Icon = Trophy;
                let gradient = "from-emerald-500/10 via-emerald-500/5 to-transparent";
                
                if (isBlocker) { 
                  sColor = "red"; 
                  label = "URGENT BLOCKER"; 
                  Icon = AlertTriangle; 
                  gradient = "from-red-500/10 via-red-500/5 to-transparent";
                } else if (isAsk) { 
                  sColor = "amber"; 
                  label = "FOUNDER REQUEST"; 
                  Icon = HelpCircle; 
                  gradient = "from-amber-500/10 via-amber-500/5 to-transparent";
                }

                const fullDate = update.created_at ? new Date(update.created_at).toLocaleDateString("default", { day: "numeric", month: "short" }) : "";
                const timeAgoStr = (d: string) => {
                  const diff = Date.now() - new Date(d).getTime();
                  const mins = Math.floor(diff / 60000);
                  if (mins < 60) return `${mins}m ago`;
                  const hrs = Math.floor(mins / 60);
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${Math.floor(hrs / 24)}d ago`;
                };

                return (
                  <div key={update.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                    {/* Signal Header Banner */}
                    <div className={`h-10 px-4 flex items-center gap-2 bg-gradient-to-r ${gradient} border-b border-gray-50`}>
                      <Icon className={`w-3.5 h-3.5 text-${sColor}-600`} />
                      <span className={`text-[10px] font-black uppercase tracking-[0.2em] text-${sColor}-700`}>
                        {label}
                      </span>
                    </div>
                    
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          {fullDate} · <Clock className="w-2.5 h-2.5" /> {update.created_at ? timeAgoStr(update.created_at) : "—"}
                        </p>
                      </div>
                      <p className="text-sm text-[#1A1A1A] font-medium leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-50/50">
                        {update.content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>



          {/* 8. NOTES */}
          <TabsContent value="notes" className="mt-0">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Interaction Log</CardTitle>
                    <CardDescription>Internal admin notes and advisor comments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <Textarea 
                        placeholder="Add a private note about this startup..." 
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        className="min-h-[120px] rounded-2xl border-gray-100 bg-gray-50/50"
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => addNote.mutate()}
                          disabled={addNote.isPending || !noteText.trim()}
                          className="bg-[#635BFF] text-white rounded-xl gap-2 font-bold px-6"
                        >
                          {addNote.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Note'} <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-4">
                      {notes.length > 0 ? (
                        notes.map(note => {
                          const noteAuthor = (note as any).profiles?.full_name || 'Lab Advisor';
                          return (
                            <div key={note.id} className="p-4 rounded-xl bg-gray-50/50 border border-gray-50 relative group">
                              <div className="flex items-center gap-3 mb-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={(note as any).profiles?.avatar_url || ''} />
                                  <AvatarFallback className="text-[10px] font-bold bg-[#635BFF]/10 text-[#635BFF]">
                                    {noteAuthor.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-bold text-gray-900">{noteAuthor}</span>
                                <span className="text-[10px] text-gray-400">{new Date(note.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-gray-600">{note.content}</p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-center text-sm text-gray-400 py-8">No notes yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card className="border-none shadow-sm bg-white rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold">Lab Lead Checklist</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      'Verify Q1 Financials',
                      'Schedule Bridge Meeting',
                      'Introduce to Angel Network',
                      'Check Logo Branding'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded border border-gray-200" />
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* 9. VAULT */}
          <TabsContent value="vault" className="mt-0">
             <Card className="border-none shadow-sm bg-white rounded-2xl">
               <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div>
                   <CardTitle className="text-lg font-bold">Document Vault</CardTitle>
                   <CardDescription>Secure Data Room and files</CardDescription>
                 </div>
                 <Button variant="outline" className="rounded-xl gap-2 border-gray-200 w-full sm:w-auto">
                   <Download className="w-4 h-4" /> Download All
                 </Button>
               </CardHeader>
               <CardContent>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {documents.length > 0 ? (
                      documents.map(doc => (
                        <div key={doc.id} className="p-4 rounded-xl border border-gray-50 bg-gray-50/50 flex items-center gap-4 group hover:bg-white hover:border-primary/20 transition-all cursor-pointer">
                          <div className="p-3 rounded-lg bg-white border border-gray-100 text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors">
                            <FileText className="w-6 h-6" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{doc.file_name}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {(doc as any).file_type || 'PDF'} · {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}{Math.round((doc as any).size / 1024) || 256} KB
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="md:col-span-3 py-20 text-center text-gray-400">
                        <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm">The vault is empty. Request documents from founder.</p>
                      </div>
                    )}
                  </div>
               </CardContent>
             </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Advisor Assessment Dialog */}
      <Dialog open={isAssessmentOpen} onOpenChange={setIsAssessmentOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Log Advisor Assessment</DialogTitle>
            <DialogDescription>Submit an official Collective Lab evaluation on this startup's target execution.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Execution Rating</label>
              <div className="grid grid-cols-3 gap-2">
                {(['On Track', 'Needs Attention', 'Critical Risk'] as const).map(r => (
                  <button key={r} onClick={() => setAssessmentRating(r)}
                    className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all ${assessmentRating === r
                      ? r === 'On Track' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : r === 'Needs Attention' ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-red-500 bg-red-50 text-red-600'
                      : 'border-gray-100 text-gray-400 hover:border-gray-200'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Target Focus (Optional)</label>
              <select value={assessmentTarget?.id || ''} onChange={e => setAssessmentTarget(milestones.find(m => m.id === e.target.value) || null)}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30">
                <option value="">General Assessment</option>
                {milestones.filter(m => m.type === 'target').map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Assessment Notes</label>
              <Textarea value={assessmentText} onChange={e => setAssessmentText(e.target.value)}
                placeholder="Write your detailed evaluation here..." className="min-h-[120px] rounded-2xl border-gray-100 bg-gray-50/50 resize-none" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="rounded-full font-bold">Cancel</Button></DialogClose>
            <Button onClick={() => addAssessment.mutate()} disabled={!assessmentText.trim() || addAssessment.isPending}
              className="bg-[#635BFF] hover:bg-[#4F46E5] text-white rounded-full px-6 font-bold">
              {addAssessment.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Submit Assessment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Milestone Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Review Target</DialogTitle>
            <DialogDescription className="truncate">"{reviewTarget?.title}"</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</label>
              <select value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}
                className="w-full h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30">
                {['Active', 'On Track', 'Delayed', 'Achieved', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {reviewTarget?.target_value && (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Current Value (Goal: {reviewTarget.target_value})</label>
                <Input type="number" value={reviewProgress} onChange={e => setReviewProgress(e.target.value)}
                  className="h-11 rounded-xl bg-gray-50 border-gray-200 text-base font-bold" />
                {reviewProgress && reviewTarget.target_value > 0 && (
                  <div>
                    <Progress value={Math.min(Math.round((parseFloat(reviewProgress) / reviewTarget.target_value) * 100), 100)} className="h-2" />
                    <p className="text-center text-sm font-bold text-[#635BFF] mt-1">
                      {Math.min(Math.round((parseFloat(reviewProgress) / reviewTarget.target_value) * 100), 100)}% Complete
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost" className="rounded-full font-bold">Cancel</Button></DialogClose>
            <Button onClick={handleReviewSave} disabled={updateMilestone.isPending}
              className="bg-[#635BFF] hover:bg-[#4F46E5] text-white rounded-full px-6 font-bold">
              {updateMilestone.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Interactive Custom Nudge Modal */}
      <Dialog open={isNudgeOpen} onOpenChange={setIsNudgeOpen}>
        <DialogContent className="sm:max-w-[480px] bg-white border-none rounded-3xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Send className="w-5 h-5 text-[#635BFF]" />
              Send Message to Founder
            </DialogTitle>
            <DialogDescription className="text-xs font-medium text-gray-500 mt-1">
              Customize and dispatch a targeted message to the founder of <span className="font-semibold text-gray-800">{startup?.name}</span>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 my-4">
            {/* Severity Level */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Message Type</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "warning", label: "⚠️ Warning", activeClass: "border-amber-200 bg-amber-50 text-amber-800 ring-2 ring-amber-500/20" },
                  { value: "error", label: "🚨 Urgent", activeClass: "border-rose-200 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20" },
                  { value: "info", label: "ℹ️ Info", activeClass: "border-sky-200 bg-sky-50 text-sky-800 ring-2 ring-sky-500/20" }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setNudgeType(type.value as any)}
                    className={`flex items-center justify-center py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      nudgeType === type.value
                        ? type.activeClass
                        : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Custom Message</Label>
                <span className="text-[10px] text-gray-400 font-medium">Fully editable</span>
              </div>
              <Textarea
                value={nudgeMessage}
                onChange={(e) => setNudgeMessage(e.target.value)}
                placeholder="Type your custom message..."
                className="min-h-[120px] rounded-2xl border-gray-200 focus:border-[#635BFF] focus:ring-2 focus:ring-[#635BFF]/10 text-sm p-4 resize-none leading-relaxed"
              />
            </div>

            {/* Dynamic Card Preview */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex gap-3.5 items-start">
              <div className={`p-2 rounded-xl border ${
                nudgeType === "error" ? "bg-rose-50 border-rose-100 text-rose-600" :
                nudgeType === "warning" ? "bg-amber-50 border-amber-100 text-amber-600" :
                "bg-sky-50 border-sky-100 text-sky-600"
              }`}>
                {nudgeType === "error" ? <AlertCircle className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-none">Founder Preview</p>
                <p className="text-[10px] text-gray-400 font-semibold mt-1">Recipient: {startup?.founder_name}</p>
                <p className="text-xs text-gray-500 mt-2.5 italic line-clamp-2 leading-relaxed">
                  "{nudgeMessage || "Type a message above to see preview..."}"
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsNudgeOpen(false)}
              className="rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                sendNudge.mutate({
                  message: nudgeMessage,
                  type: nudgeType
                });
              }}
              disabled={sendNudge.isPending || !nudgeMessage.trim()}
              className="rounded-xl bg-[#635BFF] hover:bg-[#5249cf] text-white font-bold gap-2 min-w-[130px] shadow-md shadow-[#635BFF]/15"
            >
              {sendNudge.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {sendNudge.isPending ? "Sending..." : "Send Message"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
