const STAGES = ["Ideation", "Program", "Mentorship", "Flourish"] as const;

export type GrowthStage = (typeof STAGES)[number];

const stageColors: Record<GrowthStage, string> = {
  Ideation: "bg-stage-ideation",
  Program: "bg-stage-program",
  Mentorship: "bg-stage-mentorship",
  Flourish: "bg-stage-flourish",
};

interface GrowthStageBarProps {
  currentStage: GrowthStage;
}

export function GrowthStageBar({ currentStage }: GrowthStageBarProps) {
  const currentIndex = STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center gap-1.5">
      {STAGES.map((stage, i) => {
        const isActive = i <= currentIndex;
        return (
          <div key={stage} className="flex items-center gap-1.5">
            <div
              className={`h-2 w-10 rounded-full transition-colors ${
                isActive ? stageColors[stage] : "bg-muted"
              }`}
              title={stage}
            />
          </div>
        );
      })}
      <span className="ml-2 text-xs font-medium text-muted-foreground">
        {currentStage}
      </span>
    </div>
  );
}
