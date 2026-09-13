"use client";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: "bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/40",
    warning: "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border-amber-500/40",
    default: "bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border-orange-500/40",
  };

  const iconMap = {
    danger: "⚠",
    warning: "⚡",
    default: "◈",
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#0C1222] border border-slate-800 rounded-2xl shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${variant === "danger" ? "bg-red-500/15 border border-red-500/30" : variant === "warning" ? "bg-amber-500/15 border border-amber-500/30" : "bg-orange-500/15 border border-orange-500/30"}`}>
            {iconMap[variant]}
          </div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-6">{message}</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 ${variantStyles[variant]}`}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
