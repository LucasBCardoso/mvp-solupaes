import { Wheat } from 'lucide-react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
        <Wheat className="w-5 h-5 text-white" />
      </div>
      {!compact && (
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight leading-none">solupães</h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-1">
            Field Sales
          </p>
        </div>
      )}
    </div>
  );
}
