"use client";

import { useState, useMemo } from "react";
import { Trash2, Copy, Check, Users, Search } from "lucide-react";
import { banUserAction, deleteUserAction } from "./actions";
import { useKallioStore } from "@/lib/store";
import { Navigation } from "@/components/Navigation";

type StatusFilter = "all" | "active" | "inactive";

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastSignIn: string | null;
  banned: boolean;
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

export function UsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (statusFilter === "active" && u.banned) return false;
      if (statusFilter === "inactive" && !u.banned) return false;
      if (!q) return true;
      return u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q);
    });
  }, [users, search, statusFilter]);

  function copyEmails() {
    navigator.clipboard.writeText(filtered.map((u) => u.email).join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function toggleBan(user: AdminUser) {
    await banUserAction(user.id, !user.banned);
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, banned: !u.banned } : u));
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`¿Eliminar la cuenta de ${user.email}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(user.id);
    await deleteUserAction(user.id);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setDeletingId(null);
  }

  const active = users.filter((u) => !u.banned).length;
  const showing = filtered.length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navigation />
      <main className="lg:ml-56 px-4 py-10 pb-24 lg:pb-10">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={20} className="text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Usuarios</h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {users.length} registrados · {active} activos
              {showing !== users.length && <span className="ml-2 text-teal-600 font-medium">· {showing} mostrados</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={copyEmails}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "¡Copiado!" : "Copiar todos los emails"}
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o email…"
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-sm">
            {(["all", "active", "inactive"] as StatusFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setStatusFilter(opt)}
                className={`px-4 py-2 transition-colors ${statusFilter === opt ? "bg-teal-600 text-white" : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
              >
                {opt === "all" ? "Todos" : opt === "active" ? "Activos" : "Inactivos"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
              {users.length === 0 ? "No hay usuarios registrados." : "Sin resultados para esta búsqueda."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Nombre</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Email</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Registro</th>
                    <th className="text-left px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Último login</th>
                    <th className="text-center px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wide">Activa</th>
                    <th className="px-5 py-3.5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filtered.map((user) => (
                    <tr key={user.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${user.banned ? "opacity-50" : ""}`}>
                      <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-200">
                        {user.name || <span className="text-slate-400 italic">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => navigator.clipboard.writeText(user.email)}
                          title="Copiar email"
                          className="text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors font-mono text-xs"
                        >
                          {user.email}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(user.createdAt)}</td>
                      <td className="px-5 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmt(user.lastSignIn)}</td>
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => toggleBan(user)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${!user.banned ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${!user.banned ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => deleteUser(user)}
                          disabled={deletingId === user.id}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">Acceso restringido · Kallio 2026</p>
      </div>
      </main>
    </div>
  );
}
