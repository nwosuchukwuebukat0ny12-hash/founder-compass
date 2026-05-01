import React, { useEffect, useState } from "react";
import { Check, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PulseCelebrationProps {
  onDismiss: () => void;
}

export function PulseCelebration({ onDismiss }: PulseCelebrationProps) {
  const [stage, setStage] = useState<"enter" | "glow" | "rocket">("enter");

  useEffect(() => {
    // Sequence the animations
    const glowTimer = setTimeout(() => setStage("glow"), 500);
    const rocketTimer = setTimeout(() => setStage("rocket"), 1200);
    const dismissTimer = setTimeout(() => onDismiss(), 4000);

    return () => {
      clearTimeout(glowTimer);
      clearTimeout(rocketTimer);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative flex flex-col items-center text-center max-w-sm w-full p-6">
        
        {/* Glow & Checkmark Container */}
        <div className="relative w-32 h-32 flex items-center justify-center mb-8">
          {/* Radial Glow */}
          <div 
            className={`absolute inset-0 bg-[#00D395] rounded-full blur-3xl transition-all duration-1000 ${
              stage !== "enter" ? "opacity-30 scale-150" : "opacity-0 scale-50"
            }`}
          />
          
          {/* Main Circle */}
          <div className="relative z-10 w-20 h-20 bg-gradient-to-tr from-[#00A389] to-[#00D395] rounded-full flex items-center justify-center shadow-lg shadow-[#00D395]/40 animate-in zoom-in-50 duration-500">
            <Check className="w-10 h-10 text-white" strokeWidth={3} />
          </div>

          {/* Rocket Animation */}
          <div 
            className={`absolute bottom-0 z-20 transition-all duration-1000 ease-in-out ${
              stage === "rocket" 
                ? "translate-y-[-150px] opacity-100 scale-110" 
                : "translate-y-0 opacity-0 scale-50"
            }`}
          >
            <div className="relative">
              <Rocket className="w-8 h-8 text-[#1A1A1A] fill-[#F9F6F2]" />
              {/* Confetti Trails */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 flex gap-1 mt-1">
                <div className="w-1 h-3 bg-[#00D395] rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
                <div className="w-1 h-4 bg-[#F5A623] rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
                <div className="w-1 h-2 bg-[#635BFF] rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300 fill-mode-both">
          <h2 className="text-2xl font-bold text-[#1A1A1A] tracking-tight">You're all set for April!</h2>
          <p className="text-sm text-gray-500 font-medium">Your Founder Pulse check-in has been submitted successfully.</p>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[#878A22] mt-2">
            Keep building 🚀
          </div>
        </div>

        {/* Dismiss Button */}
        <div className="mt-10 animate-in fade-in duration-500 delay-1000 fill-mode-both w-full">
          <Button 
            onClick={onDismiss}
            className="w-full bg-[#00D395] hover:bg-[#00A389] text-white rounded-xl h-12 text-sm font-bold shadow-lg shadow-[#00D395]/20"
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
