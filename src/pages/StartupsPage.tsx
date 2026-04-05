import { useState } from "react";
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Rocket } from "lucide-react";
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
import { GrowthStageBar, type GrowthStage } from "@/components/GrowthStageBar";

interface Startup {
  id: string;
  name: string;
  founder: string;
  industry: string;
  stage: GrowthStage;
}

const sampleStartups: Startup[] = [
  { id: "1", name: "PayHive", founder: "Amara Osei", industry: "FinTech", stage: "Mentorship" },
  { id: "2", name: "MediSync", founder: "Raj Patel", industry: "HealthTech", stage: "Program" },
  { id: "3", name: "GreenLoop", founder: "Lina Chen", industry: "CleanTech", stage: "Flourish" },
  { id: "4", name: "EduSpark", founder: "James Mwangi", industry: "EdTech", stage: "Ideation" },
  { id: "5", name: "DataNova", founder: "Sofia Reyes", industry: "AI / ML", stage: "Program" },
];

const industryColors: Record<string, string> = {
  FinTech: "bg-blue-50 text-blue-700 border-blue-200",
  HealthTech: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CleanTech: "bg-green-50 text-green-700 border-green-200",
  EdTech: "bg-amber-50 text-amber-700 border-amber-200",
  "AI / ML": "bg-violet-50 text-violet-700 border-violet-200",
};

export default function StartupsPage() {
  const [startups] = useState<Startup[]>(sampleStartups);
  const [search, setSearch] = useState("");

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
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Startup
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Rocket className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-base font-medium">No startups yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Get started by adding your first startup.
          </p>
          <Button className="mt-4" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Startup
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Startup & Founder</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Growth Stage</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((startup) => (
                <TableRow key={startup.id} className="group cursor-pointer">
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
                    <GrowthStageBar currentStage={startup.stage} />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
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
