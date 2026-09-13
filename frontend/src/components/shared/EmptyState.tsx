interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
}

export default function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-2xl mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-bold text-slate-300 mb-1">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs text-center">{message}</p>
    </div>
  );
}
