import { useState } from "react";
import { Upload, FileText, CheckCircle2, Clock, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { GrowthStageBar } from "@/components/GrowthStageBar";

const REQUIRED_DOCS = [
  { id: 1, name: "Pitch Deck (The Big Idea)", status: "completed" },
  { id: 2, name: "Product Roadmap", status: "completed" },
  { id: 3, name: "Founder Bio & Cap Table", status: "pending", actionReq: true },
  { id: 4, name: "Legal & KYC", status: "locked" },
  { id: 5, name: "Term Sheet / MOU", status: "locked" },
  { id: 6, name: "Financial Model", status: "locked" },
];

export default function FounderPortalPage() {
  const [isUploading, setIsUploading] = useState(false);

  const simulateUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      alert("File uploaded successfully! A Lab Staff member will verify it shortly to advance your stage.");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background border-t-4 border-primary">
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between pt-8">
          <div>
            <Badge variant="outline" className="mb-3 text-primary border-primary/30">External Founder Portal</Badge>
            <h1 className="text-3xl font-semibold tracking-tight font-serif">Welcome back, NileMind</h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Track your startup's progression through the Collective Lab lifecycle. 
              Complete your pending tasks to move to the next stage.
            </p>
          </div>
          <div className="bg-card p-4 rounded-xl border shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Current Status</h3>
            <GrowthStageBar currentStage="Program" />
          </div>
        </div>

        <Separator />

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Action Required Column */}
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Action Required</h2>
            <Card className="border-primary/50 shadow-md">
              <CardHeader className="bg-primary/5 pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Upload Founder Bio & Cap Table</CardTitle>
                  <Badge variant="default" className="bg-destructive hover:bg-destructive">Priority</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <p className="text-sm text-foreground">
                  To graduate from the <strong>Program</strong> stage into <strong>Mentorship</strong>, we need to verify your team's ownership split and skills.
                </p>
                <div 
                  className="rounded-lg border-2 border-dashed border-primary/30 p-8 flex flex-col items-center justify-center bg-muted/30 transition-colors hover:bg-muted/60 cursor-pointer"
                  onClick={simulateUpload}
                >
                  {isUploading ? (
                    <Clock className="h-10 w-10 text-primary animate-pulse" />
                  ) : (
                    <Upload className="h-10 w-10 text-primary mb-3" />
                  )}
                  <p className="font-medium">{isUploading ? "Verifying..." : "Click to select file"}</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF or Excel allowed</p>
                </div>
              </CardContent>
            </Card>

            <h2 className="text-xl font-semibold pt-4">Stage Requirement Checklist</h2>
            <div className="bg-card border rounded-lg overflow-hidden">
              {REQUIRED_DOCS.map((doc, idx) => (
                <div key={doc.id} className={`flex items-center p-4 border-b last:border-0 ${doc.actionReq ? 'bg-primary/5' : ''}`}>
                  <div className="mr-4">
                    {doc.status === 'completed' && <CheckCircle2 className="text-accent h-5 w-5" />}
                    {doc.status === 'pending' && <PlayCircle className="text-primary h-5 w-5 animate-pulse" />}
                    {doc.status === 'locked' && <Clock className="text-muted-foreground h-5 w-5 opacity-50" />}
                  </div>
                  <span className={`flex-1 font-medium ${doc.status === 'locked' ? 'text-muted-foreground' : 'text-foreground'}`}>
                    {doc.name}
                  </span>
                  {doc.status === "completed" && <Badge variant="outline" className="text-xs text-accent border-accent/30">Verified</Badge>}
                  {doc.status === "pending" && <Badge className="text-xs">Pending Upload</Badge>}
                  {doc.status === "locked" && <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Locked</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Column */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Stage Resources</h2>
            <Card>
              <CardContent className="p-0">
                <div className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors block">
                  <h4 className="font-medium text-sm">How to value your startup</h4>
                  <p className="text-xs text-muted-foreground mt-1">Article • 5 min read</p>
                </div>
                <div className="p-4 border-b hover:bg-muted/50 cursor-pointer transition-colors block">
                  <h4 className="font-medium text-sm">Mentorship Guideline Docs</h4>
                  <p className="text-xs text-muted-foreground mt-1">PDF • Collective Lab</p>
                </div>
                <div className="p-4 hover:bg-muted/50 cursor-pointer transition-colors block">
                  <h4 className="font-medium text-sm">Preparing for Mentorship</h4>
                  <p className="text-xs text-muted-foreground mt-1">Video • 12 min watch</p>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
