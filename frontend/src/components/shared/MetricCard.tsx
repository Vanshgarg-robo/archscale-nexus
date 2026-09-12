interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  icon?: string;
  color?: "orange" | "blue" | "emerald" | "red" | "amber" | "slate";
}

const colorMap = {
  orange: "from-orange-500/10 to-orange-600/5 border-orange-500/20",
  blue: "from-blue-500/10 to-blue-600/5 border-blue-500/20",
  emerald: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/20",
  red: "from-red-500/10 to-red-600/5 border-red-500/20",
  amber: "from-amber-500/10 to-amber-600/5 border-amber-500/20",
  slate: "from-slate-500/10 to-slate-600/5 border-slate-500/20",
};

const textColorMap = {
  orange: "text-orange-400",
  blue: "text-blue-400",
  emerald: "text-emerald-400",
  red: "text-red-400",
  amber: "text-amber-400",
  slate: "text-slate-400",
};

export default function MetricCard({ title, value, subtitle, trend, icon, color = "slate" }: MetricCardProps) {
  return (
    <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-4 transition-all duration-200 hover:scale-[1.02]`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${textColorMap[color]}`}>{value}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {icon && <span className="text-xl opacity-50">{icon}</span>}
      </div>
      {trend && (
        <div className="mt-2 flex items-center gap-1">
          <span className={`text-xs ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-500"}`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        </div>
      )}
    </div>
  );
}
