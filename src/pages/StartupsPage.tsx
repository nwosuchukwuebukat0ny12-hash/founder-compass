import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, MoreHorizontal, Pencil, Trash2, 
  Rocket, Loader2, AlertTriangle, TrendingUp, 
  TrendingDown, Activity, Users, Filter, 
  ArrowUpRight, ArrowDownRight, Globe, 
  Zap, ShieldCheck, DollarSign, Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const categoryStyles: Record<string, string> = {
  Ideation: "bg-blue-50 text-blue-700 border-blue-200",
  Innovators: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SME: "bg-amber-50 text-amber-700 border-amber-200",
};

const industryColors: Record<string, string> = {
  FinTech: "bg-blue-50 text-blue-700 border-blue-200",
  HealthTech: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CleanTech: "bg-green-50 text-green-700 border-green-200",
  EdTech: "bg-amber-50 text-amber-700 border-amber-200",
  "AI / ML": "bg-violet-50 text-violet-700 border-violet-200",
};

function classifyStage(stage: string | null): "Early" | "Growth" | "Maturity" {
  const s = (stage || "").toLowerCase();
  if (["ideation", "mvp", "seed", "program"].includes(s)) return "Early";
  if (["scaling", "series a", "expansion", "mentorship", "growth"].includes(s)) return "Growth";
  if (["profitability", "exit-ready", "sustainability", "flourish", "maturity"].includes(s)) return "Maturity";
  return "Early";
}

export default function StartupsPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();

  const { data: startups = [], isLoading: loadingStartups } = useQuery({
    queryKey: ["startups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: allFinancials = [] } = useQuery({
    queryKey: ["all-financials"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startup_financials").select("*").order("month", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: allPulses = [] } = useQuery({
    queryKey: ["all-pulses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pulses").select("*").order("month", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const isLoading = loadingStartups;

  // --- DYNAMIC INTELLIGENCE ENGINE ---
  const enrichedStartups = useMemo(() => {
    return startups.map(s => {
      const pulses = allPulses.filter(p => p.startup_id === s.id);
      const financials = allFinancials.filter(f => f.startup_id === s.id);
      
      const currentPulse = pulses[0] || null;
      const prevPulse = pulses[1] || null;
      
      // Growth (MoM)
      const growth = (currentPulse && prevPulse && prevPulse.mrr > 0)
        ? ((currentPulse.mrr - prevPulse.mrr) / prevPulse.mrr) * 100
        : 0;

      // Runway (Cash / 3-Month Avg Monthly Burn)
      const cash = currentPulse?.cash_in_bank || 0;
      
      const monthlyGroups: Record<string, number> = {};
      financials.forEach(f => {
        const monthKey = f.month.slice(0, 7);
        monthlyGroups[monthKey] = (monthlyGroups[monthKey] || 0) + (f.expenses || 0);
      });

      const monthValues = Object.values(monthlyGroups).slice(-3);
      const avgMonthlyBurn = monthValues.length > 0
        ? monthValues.reduce((sum, val) => sum + val, 0) / monthValues.length
        : currentPulse?.expenses || 0;
      
      const runway = avgMonthlyBurn > 0 ? cash / avgMonthlyBurn : 0;

      // Health Status
      let health: "Stable" | "Growing" | "At Risk" = "Stable";
      if (runway < 3) health = "At Risk";
      else if (growth > 15) health = "Growing";

      return {
        ...s,
        dynamicRunway: runway,
        dynamicGrowth: growth,
        health,
        stage: classifyStage(s.current_stage),
        needsReview: s.is_delayed || runway < 6
      };
    });
  }, [startups, allFinancials, allPulses]);

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + "M";
    if (val >= 1000) return (val / 1000).toFixed(1) + "k";
    return val.toLocaleString();
  };

  const filtered = useMemo(() => {
    let result = enrichedStartups.filter(
      (s) =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.founder_name.toLowerCase().includes(search.toLowerCase())
    );

    if (activeTab === "student") {
      result = result.filter(s => s.institutional_status === "Student");
    } else if (activeTab === "alumni") {
      result = result.filter(s => s.institutional_status === "Alumni");
    }

    return result;
  }, [startups, search, activeTab]);

  const stats = useMemo(() => {
    return {
      total: enrichedStartups.length,
      studentCount: enrichedStartups.filter(s => s.institutional_status === "Student").length,
      alumniCount: enrichedStartups.filter(s => s.institutional_status === "Alumni").length,
      avgRunway: Math.round(enrichedStartups.reduce((acc, s) => acc + (s.dynamicRunway || 0), 0) / (enrichedStartups.length || 1)),
    };
  }, [enrichedStartups]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* 1. HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground font-heading">Startup Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Monitoring health, runway, and growth velocity across <strong className="text-foreground">{startups.length} ventures</strong>.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 px-4 gap-2 border-primary/10 hover:bg-primary/5 text-primary">
            <Zap className="h-4 w-4" /> Lab Insights
          </Button>
        </div>
      </div>

      {/* 2. METRIC STRIP (Fatimah's Palette) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Total Ventures", value: stats.total, icon: Building2, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Student Ventures", value: stats.studentCount, icon: Users, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Alumni Ventures", value: stats.alumniCount, icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Avg. Runway", value: `${stats.avgRunway} Mo`, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm bg-card overflow-hidden relative">
            <div className={`absolute top-0 left-0 w-1 h-full ${stat.color.replace('text', 'bg')}`}></div>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 3. FILTERS & SEARCH */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-primary/5">
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="all" className="px-6 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">All</TabsTrigger>
            <TabsTrigger value="student" className="px-6 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Students</TabsTrigger>
            <TabsTrigger value="alumni" className="px-6 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Alumni</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, founder, industry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-muted/30 border-none h-10 text-sm focus-visible:ring-primary/20"
          />
        </div>
      </div>

      {/* 4. STARTUP TABLE */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-24 bg-muted/5">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted shadow-inner">
            <Globe className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">No startups found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-xs text-center">
            Try adjusting your search or filters to see more portfolio companies.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border shadow-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[300px] text-[10px] uppercase tracking-widest font-bold h-12">Startup & Founder</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold h-12 text-center">Growth (MoM)</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold h-12 text-center">Runway</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold h-12">Category</TableHead>
                <TableHead className="text-[10px] uppercase tracking-widest font-bold h-12">Health Status</TableHead>
                <TableHead className="w-[50px] h-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((startup) => (
                <TableRow 
                  key={startup.id} 
                  className="group cursor-pointer hover:bg-primary/[0.02] border-primary/5 transition-all duration-200" 
                  onClick={() => navigate(`/startups/${startup.id}`)}
                >
                  <TableCell className="py-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10 border border-primary/5 shadow-sm">
                        <AvatarImage src={startup.logo_url || ""} alt={startup.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary text-xs font-black">
                          {startup.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-none text-foreground group-hover:text-primary transition-colors truncate">{startup.name}</p>
                        <p className="mt-1.5 text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
                           <span className="text-foreground/70">{startup.founder_name}</span> 
                           <span className="opacity-30">•</span> 
                           <span className="opacity-70">{startup.industry}</span>
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center gap-1 font-bold tabular-nums text-sm ${
                        (startup.dynamicGrowth || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {(startup.dynamicGrowth || 0) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(startup.dynamicGrowth || 0).toFixed(1)}%
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1">
                       <span className={`text-sm font-bold tabular-nums ${
                         (startup.dynamicRunway || 0) < 6 ? "text-red-600" : "text-foreground"
                       }`}>
                          {(startup.dynamicRunway || 0).toFixed(1)} Mo
                       </span>
                       <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (startup.dynamicRunway || 0) < 3 ? "bg-red-500" : (startup.dynamicRunway || 0) < 6 ? "bg-amber-500" : "bg-emerald-500"
                            }`} 
                            style={{ width: `${Math.min(100, (startup.dynamicRunway || 0) * 10)}%` }}
                          />
                       </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold uppercase tracking-tighter border-none px-3 py-0.5 rounded-full ${categoryStyles[startup.current_stage || "Ideation"] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {startup.current_stage || "Ideation"}
                    </Badge>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-2">
                       {startup.needsReview ? (
                         <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                               <AlertTriangle className="h-3 w-3" />
                            </div>
                            <span className="text-[11px] font-bold text-red-600 uppercase tracking-tight">Low Runway</span>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                               <ShieldCheck className="h-3 w-3" />
                            </div>
                            <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-tight">On Track</span>
                         </div>
                       )}
                       {startup.is_delayed && (
                         <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[9px] font-bold px-2 py-0">Late Pulse</Badge>
                       )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="text-xs gap-2">
                          <Pencil className="h-3.5 w-3.5" /> Edit Startup
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2 text-red-600">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// Helper for building icon
function Building2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M8 14h.01" />
      <path d="M16 14h.01" />
    </svg>
  );
}
