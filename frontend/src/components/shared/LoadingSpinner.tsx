export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="w-10 h-10 border-2 border-slate-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-10 h-10 border-2 border-orange-500 rounded-full border-t-transparent animate-spin"></div>
      </div>
    </div>
  );
}
