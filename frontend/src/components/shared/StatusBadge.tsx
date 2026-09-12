import { getStatusBgColor } from "@/lib/utils";

interface StatusBadgeProps {
  status?: string | null;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const safeStatus = status || "pending";
  const label = safeStatus.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`inline-flex items-center border rounded-full font-medium ${getStatusBgColor(safeStatus)} ${
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}
