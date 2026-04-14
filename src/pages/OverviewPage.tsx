import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Rocket, TrendingUp, Users, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export default function OverviewPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard-overview"],
    queryFn: async () => {
      const { data: startups, error } = await supabase.from("startups").select("*");
      if (error) throw error;

      // Calculate Metrics
      const totalStartups = startups?.length || 0;
      const inMentorship = startups?.filter((s) => s.current_stage === "Mentorship").length || 0;
      const flourishing = startups?.filter((s) => s.current_stage === "Flourish").length || 0;
      const delayed = startups?.filter((s) => s.is_delayed).length || 0;

      // Group by stage for chart
      const stageCounts = {
        Ideation: 0,
        Program: 0,
        Mentorship: 0,
        Flourish: 0,
      };
      
      startups?.forEach((s) => {
        const stage = s.current_stage as keyof typeof stageCounts;
        if (stageCounts[stage] !== undefined) {
          stageCounts[stage]++;
        }
      });

      const chartData = [
        { name: "Ideation", count: stageCounts.Ideation, color: "hsl(var(--primary))" },
        { name: "Program", count: stageCounts.Program, color: "hsl(var(--primary))" },
        { name: "Mentorship", count: stageCounts.Mentorship, color: "hsl(var(--accent))" },
        { name: "Flourish", count: stageCounts.Flourish, color: "hsl(var(--accent))" },
      ];

      return {
        stats: [
          { label: "Total Portfolio", value: totalStartups.toString(), icon: Rocket },
          { label: "In Mentorship", value: inMentorship.toString(), icon: Users },
          { label: "Flourishing", value: flourishing.toString(), icon: TrendingUp },
          { label: "At Risk (Delayed)", value: delayed.toString(), icon: AlertCircle, destructive: true },
        ],
        chartData,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight font-heading">Overview Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
          Monitor your startup portfolio health at a glance. Track stage progressions and identify startups that require immediate Labs intervention.
        </p>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data?.stats.map((stat) => (
          <Card key={stat.label} className={`border ${stat.destructive ? 'border-destructive/30 bg-destructive/5' : 'bg-card shadow-sm'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className={`text-sm font-medium ${stat.destructive ? 'text-destructive' : 'text-muted-foreground'}`}>
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.destructive ? 'text-destructive' : 'text-primary'}`} />
            </CardHeader>
            <CardContent>
              <p className={`text-4xl font-bold font-heading ${stat.destructive ? 'text-destructive' : 'text-foreground'}`}>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Pane */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Chart Section */}
        <Card className="col-span-2 shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Portfolio Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.chartData || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data?.chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions / Alerts */}
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">System Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutDashboard className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Dashboard Offline Sync</p>
                <p className="text-xs text-muted-foreground mt-1">All data modules are fully synced with the secure Supabase instance.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium">Data Collection Active</p>
                <p className="text-xs text-muted-foreground mt-1">KPI tracking is accurately logging MoM growth and Retention stats.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
