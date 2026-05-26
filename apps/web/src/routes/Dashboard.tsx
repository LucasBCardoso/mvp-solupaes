import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Users, Target, TrendingUp, ArrowUpRight, AlertTriangle, Lightbulb } from 'lucide-react';
import { api, type ApiOk } from '../lib/api';
import type { DashboardSummary } from '@solupaes/shared';

const COLORS = { A: '#f59e0b', B: '#10b981', C: '#64748b' };

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => {
      const res = await api.get<ApiOk<DashboardSummary>>('/dashboard/summary');
      return res.data.data;
    },
  });

  if (isLoading || !data) return <div className="p-8 text-slate-500">Carregando…</div>;

  const chartData = [
    { name: 'Classe A', count: data.classA, color: COLORS.A },
    { name: 'Classe B', count: data.classB, color: COLORS.B },
    { name: 'Classe C', count: data.classC, color: COLORS.C },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Painel Gerencial</h2>
        <p className="text-sm md:text-base text-slate-500 mt-1">
          Inteligência de campo · Ouro Pães
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <KpiCard
          label="Visitas Realizadas"
          value={data.totalVisits.toString()}
          delta={data.weekDelta}
          icon={<Users className="w-5 h-5" />}
          color="amber"
        />
        <KpiCard
          label="Clientes Classe A"
          value={data.classA.toString()}
          icon={<Target className="w-5 h-5" />}
          subtitle="Maior potencial de conversão"
          color="emerald"
        />
        <KpiCard
          label="Score de Viabilidade Médio"
          value={`${data.avgScore}/100`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Cálculo automático Ouro Pães"
          color="blue"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-4">Composição da Carteira</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border border-slate-100 shadow-sm flex flex-col">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500" />
            Top Oportunidades
          </h3>
          <p className="text-xs md:text-sm text-slate-500 mb-4">Score ≥ 70</p>
          <div className="space-y-3 overflow-y-auto pr-1 flex-1 max-h-[360px]">
            {data.topOpportunities.length === 0 && (
              <p className="text-sm text-slate-400 italic">Nenhuma oportunidade no momento.</p>
            )}
            {data.topOpportunities.map((alert) => (
              <div key={alert.id} className="p-3 rounded-xl bg-amber-50/40 border border-amber-100">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-800 text-sm">{alert.fantasyName}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-700">
                    {alert.viabilityScore}
                  </span>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">
                  {alert.observations ?? 'Sem observações.'}
                </p>
                <div className="mt-1 text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                  {alert.representativeName}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Lightbulb className="w-6 h-6 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-slate-400">Estratégias aguardando ação</p>
            <p className="text-2xl font-bold">{data.pendingStrategies}</p>
          </div>
        </div>
        <a
          href="/estrategias"
          className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg font-semibold text-sm transition"
        >
          Abrir Kanban →
        </a>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  delta,
  subtitle,
  icon,
  color,
}: {
  label: string;
  value: string;
  delta?: number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'amber' | 'emerald' | 'blue';
}) {
  const ring = {
    amber: 'bg-amber-50 text-amber-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
  }[color];

  return (
    <div className="bg-white rounded-2xl p-5 md:p-6 border border-slate-100 shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="text-3xl font-bold text-slate-900 mt-1">{value}</h3>
        </div>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${ring}`}>{icon}</div>
      </div>
      {delta !== undefined && (
        <div className="mt-4 flex items-center text-sm font-medium text-emerald-600">
          <ArrowUpRight className="w-4 h-4 mr-1" />
          <span>
            {delta >= 0 ? '+' : ''}
            {delta}% esta semana
          </span>
        </div>
      )}
      {subtitle && !delta && <p className="text-sm text-slate-500 mt-4">{subtitle}</p>}
    </div>
  );
}
