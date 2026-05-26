import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles, ArrowRight } from 'lucide-react';
import { api, type ApiOk } from '../lib/api';
import {
  STRATEGY_LABELS_PT,
  STRATEGY_STATUS_LABELS_PT,
  type Strategy,
  type StrategyStatus,
} from '@solupaes/shared';

const COLUMNS: StrategyStatus[] = ['PROPOSED', 'IN_PROGRESS', 'WON', 'LOST', 'POSTPONED'];

const STATUS_COLORS: Record<StrategyStatus, string> = {
  PROPOSED: 'bg-amber-50 border-amber-200',
  IN_PROGRESS: 'bg-blue-50 border-blue-200',
  WON: 'bg-emerald-50 border-emerald-200',
  LOST: 'bg-red-50 border-red-200',
  POSTPONED: 'bg-slate-50 border-slate-200',
};

export function StrategiesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const res = await api.get<ApiOk<Strategy[]>>('/strategies');
      return res.data.data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StrategyStatus }) =>
      api.patch(`/strategies/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['strategies'] }),
  });

  const grouped: Record<StrategyStatus, Strategy[]> = {
    PROPOSED: [],
    IN_PROGRESS: [],
    WON: [],
    LOST: [],
    POSTPONED: [],
  };
  data?.forEach((s) => grouped[s.status].push(s));

  return (
    <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
          Estratégias Comerciais
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Kanban de oportunidades — geradas automaticamente pelo sistema ou criadas manualmente.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        {COLUMNS.map((col) => (
          <div key={col} className="bg-slate-100 rounded-2xl p-3 min-h-[300px]">
            <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide px-1 mb-3 flex items-center justify-between">
              {STRATEGY_STATUS_LABELS_PT[col]}
              <span className="bg-white text-slate-500 px-2 rounded-full text-xs">
                {grouped[col].length}
              </span>
            </h3>
            <div className="space-y-2">
              {grouped[col].map((s) => (
                <div
                  key={s.id}
                  className={`rounded-xl border p-3 ${STATUS_COLORS[col]} shadow-sm hover:shadow-md transition cursor-default`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    {s.generatedByAi && (
                      <Sparkles className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" aria-label="IA" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-900 text-sm leading-tight">{s.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-wide">
                        {STRATEGY_LABELS_PT[s.type]}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-3 mb-2">{s.description}</p>
                  <div className="text-[10px] text-slate-500 mb-2">
                    Cliente: <strong>{s.clientFantasyName ?? '—'}</strong>
                    {s.followUpAt && (
                      <> · Follow-up: {new Date(s.followUpAt).toLocaleDateString('pt-BR')}</>
                    )}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {COLUMNS.filter((c) => c !== col).map((target) => (
                      <button
                        key={target}
                        onClick={() => updateStatus.mutate({ id: s.id, status: target })}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 font-medium transition"
                      >
                        <ArrowRight className="w-2.5 h-2.5 inline mr-1" />
                        {STRATEGY_STATUS_LABELS_PT[target]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {grouped[col].length === 0 && (
                <p className="text-xs text-slate-400 italic text-center py-6">Vazio</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
