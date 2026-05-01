import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface LogoAvatarProps {
  name: string;
  className?: string;
  forceColor?: "indigo" | "emerald" | "amber" | "pink" | "teal";
}

const colorMap = {
  indigo: "bg-[#6366F1] text-white",
  emerald: "bg-[#10B981] text-white",
  amber: "bg-[#F59E0B] text-white",
  pink: "bg-[#EC4899] text-white",
  teal: "bg-[#0D9488] text-white",
};

// Deterministic color picker based on string
function getColorForString(str: string): keyof typeof colorMap {
  const colors: (keyof typeof colorMap)[] = ["indigo", "emerald", "amber", "pink", "teal"];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function LogoAvatar({ name, className, forceColor }: LogoAvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const colorKey = forceColor || getColorForString(name);
  const colorClass = colorMap[colorKey];

  return (
    <Avatar className={className}>
      <AvatarFallback className={`${colorClass} font-bold tracking-widest`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
