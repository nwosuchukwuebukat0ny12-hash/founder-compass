import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Rocket, Loader2, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const stageStyles: Record<string, string> = {
  Early: "bg-blue-50 text-blue-700 border-blue-200",
  Growth: "bg-violet-50 text-violet-700 border-violet-200",
  Maturity: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// Same logic as Command Center — keeps the whole app in sync
function classifyStage(stage: string | null): "Early" | "Growth" | "Maturity" {
  const s = (stage || "").toLowerCase();
  if (["ideation", "mvp", "seed", "program"].includes(s)) return "Early";
  if (["scaling", "series a", "expansion", "mentorship", "growth"].includes(s)) return "Growth";
  if (["profitability", "exit-ready", "sustainability", "flourish", "maturity"].includes(s)) return "Maturity";
  return "Early";
}

interface Startup {
  id: string;
  name: string;
  founder: string;
  industry: string;
  stage: "Early" | "Growth" | "Maturity";
  needsReview: boolean;
}

const industryColors: Record<string, string> = {
  FinTech: "bg-blue-50 text-blue-700 border-blue-200",
  HealthTech: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CleanTech: "bg-green-50 text-green-700 border-green-200",
  EdTech: "bg-amber-50 text-amber-700 border-amber-200",
  "AI / ML": "bg-violet-50 text-violet-700 border-violet-200",
};

export default function StartupsPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const { data: startups = [], isLoading } = useQuery({
    queryKey: ["startups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("startups").select("*");
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        founder: row.founder_name,
        industry: row.industry ?? "",
        stage: classifyStage(row.current_stage),
        needsReview: row.is_delayed || (row.runway_months !== null && row.runway_months !== undefined && row.runway_months < 6),
      }));
    },
  });

  const filtered = startups.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.founder.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Startups</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your portfolio of startups and track their growth.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search startups..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Rocket className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-medium">No startups yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Waiting for startups to complete onboarding.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Startup & Founder</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((startup) => (
                <TableRow key={startup.id} className="group cursor-pointer" onClick={() => navigate(`/startups/${startup.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                          {startup.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium leading-none">{startup.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{startup.founder}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs font-medium ${industryColors[startup.industry] ?? ""}`}
                    >
                      {startup.industry}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold ${stageStyles[startup.stage] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {startup.stage}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {startup.needsReview ? (
                      <Badge variant="destructive" className="text-xs font-semibold gap-1">
                        <AlertTriangle className="h-3 w-3" /> Needs Review
                      </Badge>
                    ) : (
                      <span className="text-xs text-emerald-600 font-medium">On Track</span>
                    )}
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
