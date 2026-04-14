import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldCheck, Database, Rocket } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center space-y-12">
      {/* Hero Section */}
      <div className="space-y-6 max-w-2xl">
        <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary mb-4">
          <Rocket className="mr-2 h-4 w-4" />
          Founder Pulse SRM v1.0
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground font-heading">
          Startup Relationship <br /> 
          <span className="text-primary italic">Management</span>
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          The premium internal tool for the Collective Lab. Track growth stages, 
          manage institutional memory, and collaborate with founders—all in one high-fidelity interface.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <Button 
          onClick={() => navigate("/startups")} 
          size="lg" 
          className="flex-1 h-14 text-lg font-semibold group rounded-xl"
        >
          Enter Dashboard
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full pt-12">
        <div className="p-8 rounded-2xl border bg-card text-left space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold">Institutional Memory</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Never lose founder context again. Persistent activity logs and secure notes ensure a seamless handover for Lab staff.
          </p>
        </div>
        
        <div className="p-8 rounded-2xl border bg-card text-left space-y-4 shadow-sm">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="text-xl font-semibold">Stage Verification</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Automated stage-gate transitions based on strict document requirements from Ideation through to Flourish.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold pt-8">
        Designed for The Collective Lab Buildathon
      </p>
    </div>
  );
};

export default Index;

