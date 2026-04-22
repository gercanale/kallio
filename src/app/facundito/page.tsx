"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Copy, Check, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { ADMIN_EMAILS } from "@/lib/admin-config";

interface AdminUser {
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

export default function FacunditoPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !ADMIN_EMAILS.includes(user.email ?? "")) {
        router.replace("/dashboard");
      } else {
        setAuthorized(true);
      }
    });
  }, [router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        body.error === "SUPABASE_SERVICE_ROLE_KEY not configured"
          ? "Falta configurar SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
          : "No se pudieron cargar los usuarios."
      );
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authorized) fetchUsers();
  }, [authorized, fetchUsers]);

  async function toggleBan(user: AdminUser) {
    await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banned: !user.banned }),
    });
    setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, banned: !u.banned } : u));
  }

  async function deleteUser(user: AdminUser) {
    if (!confirm(`¿Eliminar la cuenta de ${user.email}? Esta acción no se puede deshacer.`)) return;
    setDeletingId(user.id);
    await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setDeletingId(null);
  }

  function copyEmails() {
    const emails = users.map((u) => u.email).join(", ");
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!authorized || loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-slate-500 text-sm">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  const active = users.filter((u) => !u.banned).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={20} className="text-teal-600" />
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Usuarios
              </h1>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {users.length} registrados · {active} activos
            </p>
          </div>
          <button
            onClick={copyEmails}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium transition-colors"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "¡Copiado!" : "Copiar todos los emails"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
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
                {users.map((user) => (
                  <tr key={user.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${user.banned ? "opacity-50" : ""}`}>
                    <td className="px-5 py-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {user.name || <span className="text-slate-400 italic">—</span>}
                      </span>
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
                        aria-label={user.banned ? "Activar cuenta" : "Desactivar cuenta"}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${!user.banned ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                        aria-label="Eliminar cuenta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-4 text-xs text-slate-400 text-center">Acceso restringido · Kallio 2026</p>
      </div>
    </div>
  );
}
