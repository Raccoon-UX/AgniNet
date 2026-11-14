import React from "react";

interface PageHeaderProps {
  badge?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  badge = "Earth Observation / Satellite Fire Radiometry",
  title,
  description,
  action,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 pb-4 border-b border-slate-200">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono font-semibold tracking-wider uppercase text-slate-500">
            {badge}
          </span>
          <span className="text-slate-300">&bull;</span>
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            NASA Space Apps 2026
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
          {description}
        </p>
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
};
