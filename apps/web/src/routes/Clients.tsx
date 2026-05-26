import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Store } from 'lucide-react';
import { api, type ApiOk } from '../lib/api';
import type { Client } from '@solupaes/shared';

export function ClientsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const res = await api.get<ApiOk<Client[]>>(`/clients`, { params: { search: search || undefined } });
      return res.data.data;
    },
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Clientes</h2>
          <p className="text-sm text-slate-500 mt-1">Cadastro de estabelecimentos visitados</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, razão social, cidade…"
            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-amber-500 w-full md:w-80"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && <p className="text-slate-400 text-sm">Carregando…</p>}
        {data?.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900 truncate">{c.fantasyName}</h3>
                <p className="text-xs text-slate-500 truncate">{c.socialReason ?? '—'}</p>
              </div>
            </div>
            <dl className="text-xs text-slate-600 space-y-1">
              <div>
                <dt className="inline font-medium text-slate-400">Endereço: </dt>
                <dd className="inline">{c.addressLine}</dd>
              </div>
              {c.city && (
                <div>
                  <dt className="inline font-medium text-slate-400">Cidade: </dt>
                  <dd className="inline">{c.city}/{c.state}</dd>
                </div>
              )}
              {c.phone && (
                <div>
                  <dt className="inline font-medium text-slate-400">Telefone: </dt>
                  <dd className="inline">{c.phone}</dd>
                </div>
              )}
              <div>
                <dt className="inline font-medium text-slate-400">Trabalha congelados: </dt>
                <dd className="inline">{c.worksWithFrozen ? 'Sim' : 'Não'}</dd>
              </div>
              {c.currentSupplier && (
                <div>
                  <dt className="inline font-medium text-slate-400">Fornecedor: </dt>
                  <dd className="inline">{c.currentSupplier}</dd>
                </div>
              )}
            </dl>
          </div>
        ))}
        {data && data.length === 0 && (
          <p className="text-slate-400 text-sm col-span-full text-center py-12">
            Nenhum cliente encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
