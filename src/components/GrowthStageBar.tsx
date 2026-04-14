import React from "react";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";

// Officially locked order
export const STAGES = ["Ideation", "Program", "Mentorship", "Flourish"] as const;
export type GrowthStage = (typeof STAGES)[number];

interface GrowthStageBarProps {
  currentStage: GrowthStage;
  isDelayed?: boolean;
}

export function GrowthStageBar({ currentStage, isDelayed = false }: GrowthStageBarProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex flex-col gap-2 w-full max-w-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          STATUS: {isDelayed ? "DELAYED" : "IN PROGRESS"}
        </span>
        <div className="flex items-center gap-1">
          {isDelayed ? (
            <AlertTriangle className="w-4 h-4 text-destructive" />
          ) : currentIndex === STAGES.length - 1 ? (
            <CheckCircle2 className="w-4 h-4 text-primary" />
          ) : (
            <Clock className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {STAGES.map((stage, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const isUpcoming = i > currentIndex;

          let barColor = "bg-muted"; // Upcoming state
          
          if (isCompleted) {
            barColor = "bg-primary"; // Completed state
          } else if (isActive) {
            if (isDelayed) {
              barColor = "bg-destructive"; // Delayed state (Fatima's Red)
            } else {
              barColor = "bg-primary animate-pulse"; // Active state
            }
          }

          return (
            <div key={stage} className="flex-1 flex flex-col items-center gap-1 group relative">
              <div
                className={`h-2.5 w-full rounded-full transition-all duration-300 ${barColor}`}
              />
              {/* Optional tooltip for the stage name */}
              <span className="absolute -bottom-6 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-foreground bg-card px-2 py-0.5 rounded shadow-sm border">
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
