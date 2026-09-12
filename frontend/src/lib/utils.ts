import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatCurrency(amount: number | null): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    completed: "text-emerald-400",
    in_progress: "text-blue-400",
    not_started: "text-slate-400",
    blocked: "text-red-400",
    on_hold: "text-amber-400",
    cancelled: "text-slate-500",
    pending: "text-amber-400",
    approved: "text-emerald-400",
    rejected: "text-red-400",
    overdue: "text-red-500",
    proposed: "text-blue-400",
    under_review: "text-amber-400",
    implemented: "text-emerald-400",
    healthy: "text-emerald-400",
    at_risk: "text-amber-400",
    critical: "text-red-400",
    low: "text-emerald-400",
    medium: "text-amber-400",
    high: "text-orange-400",
  };
  return colors[status] || "text-slate-400";
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    not_started: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    blocked: "bg-red-500/10 text-red-400 border-red-500/20",
    on_hold: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    proposed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    under_review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    implemented: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    healthy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    at_risk: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    low: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return colors[status] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

export function getSeverityIcon(severity: string): string {
  const icons: Record<string, string> = {
    critical: "🔴",
    high: "🟠",
    medium: "🟡",
    low: "🟢",
  };
  return icons[severity] || "⚪";
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    client: "Client",
    architect: "Architect",
    interior_designer: "Interior Designer",
    structural_engineer: "Structural Engineer",
    electrical_engineer: "Electrical Engineer",
    contractor: "Contractor",
    vendor: "Vendor",
    project_manager: "Project Manager",
    site_supervisor: "Site Supervisor",
    administrator: "Administrator",
  };
  return labels[role] || role;
}

export function getRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateStr);
}
