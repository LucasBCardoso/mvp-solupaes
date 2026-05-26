import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MapPin, Store } from 'lucide-react';
import { api, type ApiOk } from '../lib/api';
import type { Visit } from '@solupaes/shared';
import { useAuthStore } from '../lib/auth';

export function VisitsPage() {
  const user = useAuthStore((s) => s.user);
  const isGestor = user?.role === 'GESTOR' || user?.role === 'ADMIN';

  const { data, isLoading } = useQuery({
    queryKey: ['visits'],
    queryFn: async () => {
      const res = await api.get<ApiOk<Visit[]>>('/visits?limit=200');
      return res.data.data;
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Visitas</h2>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            {isGestor ? 'Todas as visitas registradas' : 'Suas visitas de campo'}
          </p>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-600 font-medium tracking-wide text-xs uppercase">
              <tr>
                <th className="px-6 py-4">Estabelecimento</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Localização</th>
                <th className="px-6 py-4 text-center">Classe</th>
                <th className="px-6 py-4 text-right">Preço atual</th>
                <th className="px-6 py-4 text-right">Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Carregando…
                  </td>
                </tr>
              )}
              {data?.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {v.facadePhotoUrl ? (
                        <img src={v.facadePhotoUrl} alt="" className="w-9 h-9 rounded-lg object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                          <Store className="w-4 h-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-800">{v.fantasyName}</div>
                        {isGestor && (
                          <div className="text-xs text-slate-400">{v.representativeName}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {formatDistanceToNow(new Date(v.visitedAt), { addSuffix: true, locale: ptBR })}
                  </td>
                  <td className="px-6 py-4">
                    {v.lat != null && v.lng != null ? (
                      <a
                        href={`https://maps.google.com/?q=${v.lat},${v.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 hover:underline inline-flex items-center gap-1 text-xs font-medium"
                      >
                        <MapPin className="w-3 h-3" /> Ver no mapa
                      </a>
                    ) : (
                      <span className="text-slate-400 text-xs italic">Sem GPS</span>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[180px]">
                      {v.addressLine}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ClassBadge cls={v.classification} />
                  </td>
                  <td className="px-6 py-4 text-right text-slate-700 font-mono text-xs">
                    {v.currentPrice ? `R$ ${v.currentPrice.toFixed(2)}` : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-slate-800">{v.viabilityScore}</span>
                    <span className="text-slate-400 text-xs">/100</span>
                  </td>
                </tr>
              ))}
              {data && data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    Nenhuma visita registrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClassBadge({ cls }: { cls: 'A' | 'B' | 'C' }) {
  const styles = {
    A: 'bg-amber-100 text-amber-700',
    B: 'bg-emerald-100 text-emerald-700',
    C: 'bg-slate-100 text-slate-700',
  } as const;
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded font-bold text-xs ${styles[cls]}`}>
      {cls}
    </span>
  );
}
