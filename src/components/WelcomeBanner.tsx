import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

interface WelcomeBannerProps {
  founderName: string;
  startupName: string;
  pulseStatus: "due" | "up-to-date";
  onActionClick?: () => void;
}

export function WelcomeBanner({ founderName, startupName, pulseStatus, onActionClick }: WelcomeBannerProps) {
  const isDue = pulseStatus === "due";
  
  return (
    <div className="relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-[#F9F6F2] to-[#E6F4F1] border border-[#E6F4F1] shadow-sm mb-8">
      <div className="px-8 py-10 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        <div className="space-y-2">
          <h1 className="text-4xl font-serif text-[#1A1A1A] font-medium tracking-tight">
            Welcome back, <span className="text-[#00D395] font-semibold">{founderName}</span>
          </h1>
          <p className="text-sm font-medium text-gray-500 flex items-center gap-2">
            <span className="text-[#635BFF] font-semibold">{startupName}</span> 
            <span className="text-gray-300">|</span> 
            <span>Dashboard</span>
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-3">
          <Badge 
            variant="outline" 
            className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-widest border-none ${
              isDue 
                ? "bg-[#F5A623]/10 text-[#F5A623]" 
                : "bg-[#00D395]/10 text-[#00D395]"
            }`}
          >
            {isDue ? (
              <span className="flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" /> Pulse Status: Due</span>
            ) : (
              <span className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Pulse Status: Up to date</span>
            )}
          </Badge>
          
          <button 
            onClick={onActionClick}
            className="group flex items-center gap-2 text-sm font-semibold text-[#1A1A1A] hover:text-[#00D395] transition-colors bg-white px-5 py-2.5 rounded-full shadow-sm hover:shadow border border-gray-100"
          >
            {isDue ? "Submit Check-in" : "View Progress"} 
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      
      {/* Decorative Wave/Arc */}
      <div className="absolute bottom-0 left-0 right-0 w-full overflow-hidden leading-none z-0 opacity-40">
        <svg className="relative block w-[calc(100%+1.3px)] h-[60px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M985.66,92.83C906.67,72,823.78,31,743.84,14.19c-82.26-17.34-168.06-16.33-250.45.39-57.84,11.73-114,31.07-172,41.86A600.21,600.21,0,0,1,0,27.35V120H1200V95.8C1132.19,118.92,1055.71,111.31,985.66,92.83Z" fill="#00D395" opacity="0.1"></path>
        </svg>
      </div>
      
      {/* Decorative Blur Circle */}
      <div className={`absolute top-1/2 right-[10%] -translate-y-1/2 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none ${isDue ? 'bg-[#F5A623]' : 'bg-[#00D395]'}`}></div>
    </div>
  );
}
