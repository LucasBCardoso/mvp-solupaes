import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, ShieldCheck, ShieldOff } from 'lucide-react';
import { api, type ApiOk } from '../lib/api';
import type { Role, User } from '@solupaes/shared';

export function UsersPage() {
  const qc = useQueryClient();
  const [openForm, setOpenForm] = useState(false);

  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get<ApiOk<User[]>>('/users');
      return res.data.data;
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) =>
      api.patch(`/users/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      <header className="flex justify-between items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Usuários</h2>
          <p className="text-sm text-slate-500 mt-1">Equipe Ouro Pães e permissões</p>
        </div>
        <button
          onClick={() => setOpenForm(true)}
          className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl text-sm transition flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Novo usuário
        </button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
            <tr>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">E-mail</th>
              <th className="px-6 py-4">Papel</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data?.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-6 py-3 text-slate-600">{u.email}</td>
                <td className="px-6 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-6 py-3">
                  {u.active ? (
                    <span className="text-emerald-600 text-xs font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ativo
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs font-medium">Inativo</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right">
                  <button
                    onClick={() => toggleActive.mutate({ id: u.id, active: !u.active })}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                  >
                    {u.active ? (
                      <>
                        <ShieldOff className="w-4 h-4" /> Desativar
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Reativar
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {openForm && <NewUserModal onClose={() => setOpenForm(false)} />}
    </div>
  );
}

function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    GESTOR: 'bg-amber-100 text-amber-700',
    REPRESENTANTE: 'bg-blue-100 text-blue-700',
  };
  const label: Record<Role, string> = {
    ADMIN: 'Admin',
    GESTOR: 'Gestor',
    REPRESENTANTE: 'Representante',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${map[role]}`}>{label[role]}</span>
  );
}

function NewUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'REPRESENTANTE' as Role });
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => api.post('/users', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      onClose();
    },
    onError: (e: { response?: { data?: { error?: string } } }) =>
      setErr(e.response?.data?.error ?? 'Erro ao criar'),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    create.mutate();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Novo usuário</h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Nome</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">E-mail</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Senha temporária</label>
          <input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Papel</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 text-sm bg-white"
          >
            <option value="REPRESENTANTE">Representante</option>
            <option value="GESTOR">Gestor</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold text-sm disabled:opacity-60"
          >
            Criar
          </button>
        </div>
      </form>
    </div>
  );
}
