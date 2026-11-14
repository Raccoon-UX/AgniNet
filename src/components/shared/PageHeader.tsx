import React from "react";
import { Sparkles } from "lucide-react";

interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badge = "AgniNet Intelligence Platform",
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/5">
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Sparkles className="w-3 h-3" />
            {badge}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            NASA SPACE APPS 2026
          </span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-1 text-sm text-slate-400 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
