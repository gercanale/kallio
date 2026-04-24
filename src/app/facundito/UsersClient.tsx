"use client";

import { useState, useMemo } from "react";
import { Trash2, Copy, Check, Users, Search, X } from "lucide-react";
import { banUserAction, deleteUserAction } from "./actions";
import { useT } from "@/lib/useT";
import { Navigation } from "@/components/Navigation";

const C = {
  BG: '#fdfaf3', INK: '#1a1f2e', MUTED: '#6b6456',
  BORDER: '#e8dfc8', IVA: '#c44536', OK: '#5a7a3e', CARD: '#ffffff',
};

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
  const t = useT();
  const a = t.admin;

  const [users, setUsers] = useState(initialUsers);
  const [copied, setCopied] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
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
    setDeletingId(user.id);
    await deleteUserAction(user.id);
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setDeletingId(null);
    setConfirmDeleteId(null);
  }

  const active = users.filter((u) => !u.banned).length;
  const showing = filtered.length;

  return (
    <div style={{ minHeight: '100dvh', background: C.BG, fontFamily: 'Inter, sans-serif', color: C.INK }}>
      <Navigation />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '80px 24px 88px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Users size={18} style={{ color: C.OK }} />
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{a.title}</h1>
            </div>
            <p style={{ fontSize: 13, color: C.MUTED, margin: 0 }}>
              {users.length} registrados · {active} activos
              {showing !== users.length && (
                <span style={{ marginLeft: 8, color: C.OK, fontWeight: 500 }}>· {showing} mostrados</span>
              )}
            </p>
          </div>
          <button
            onClick={copyEmails}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: copied ? C.OK : C.INK, color: 'white',
              border: 'none', borderRadius: 10, padding: '10px 16px',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? a.copied : a.copyBtn}
          </button>
        </div>

        {/* Search + filter */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.MUTED, pointerEvents: 'none' }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={a.searchPlaceholder}
              style={{
                width: '100%', boxSizing: 'border-box',
                background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 10,
                padding: '10px 14px 10px 36px', fontSize: 13, color: C.INK,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', border: `1px solid ${C.BORDER}`, borderRadius: 10, overflow: 'hidden', background: C.CARD }}>
            {(["all", "active", "inactive"] as StatusFilter[]).map((opt) => (
              <button
                key={opt}
                onClick={() => setStatusFilter(opt)}
                style={{
                  padding: '10px 16px', border: 'none', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                  background: statusFilter === opt ? C.INK : 'transparent',
                  color: statusFilter === opt ? 'white' : C.MUTED,
                }}
              >
                {opt === "all" ? a.filterAll : opt === "active" ? a.filterActive : a.filterInactive}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ background: C.CARD, border: `1px solid ${C.BORDER}`, borderRadius: 16, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: C.MUTED, fontSize: 14 }}>
              {users.length === 0 ? a.noUsers : a.noResults}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.BORDER}`, background: '#f8f4ec' }}>
                    {[a.colName, a.colEmail, a.colRegistered, a.colLastLogin, a.colActive, ""].map((col, i) => (
                      <th key={i} style={{
                        padding: '12px 20px', textAlign: i === 4 ? 'center' : i === 5 ? 'right' : 'left',
                        fontSize: 11, fontWeight: 600, color: C.MUTED,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user, idx) => (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? `1px solid ${C.BORDER}` : 'none',
                        opacity: user.banned ? 0.45 : 1,
                        background: confirmDeleteId === user.id ? '#fdf0ee' : 'transparent',
                      }}
                    >
                      <td style={{ padding: '14px 20px', fontWeight: 500 }}>
                        {user.name || <span style={{ color: C.MUTED, fontStyle: 'italic' }}>—</span>}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => navigator.clipboard.writeText(user.email)}
                          title="Copiar email"
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontFamily: 'monospace', fontSize: 12, color: C.MUTED,
                            padding: 0,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = C.INK)}
                          onMouseLeave={(e) => (e.currentTarget.style.color = C.MUTED)}
                        >
                          {user.email}
                        </button>
                      </td>
                      <td style={{ padding: '14px 20px', color: C.MUTED, whiteSpace: 'nowrap' }}>{fmt(user.createdAt)}</td>
                      <td style={{ padding: '14px 20px', color: C.MUTED, whiteSpace: 'nowrap' }}>{fmt(user.lastSignIn)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <button
                          onClick={() => toggleBan(user)}
                          style={{
                            position: 'relative', display: 'inline-flex', alignItems: 'center',
                            width: 40, height: 22, borderRadius: 999, border: 'none',
                            cursor: 'pointer', transition: 'background 0.2s',
                            background: !user.banned ? C.OK : C.BORDER,
                            padding: 0,
                          }}
                        >
                          <span style={{
                            position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                            background: C.CARD, boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                            transition: 'left 0.2s',
                            left: !user.banned ? 21 : 3,
                          }} />
                        </button>
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {confirmDeleteId === user.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                background: 'transparent', border: `1px solid ${C.BORDER}`, borderRadius: 8,
                                padding: '4px 10px', fontSize: 12, color: C.MUTED,
                                cursor: 'pointer', fontFamily: 'inherit',
                              }}
                            >
                              <X size={12} />
                            </button>
                            <button
                              onClick={() => deleteUser(user)}
                              disabled={deletingId === user.id}
                              style={{
                                background: C.IVA, border: 'none', borderRadius: 8,
                                padding: '4px 10px', fontSize: 12, color: 'white',
                                cursor: deletingId === user.id ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', opacity: deletingId === user.id ? 0.6 : 1,
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(user.id)}
                            style={{
                              background: 'transparent', border: 'none', borderRadius: 8,
                              padding: '6px', cursor: 'pointer', color: C.MUTED,
                              display: 'inline-flex', alignItems: 'center',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = C.IVA; e.currentTarget.style.background = '#fdf0ee'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = C.MUTED; e.currentTarget.style.background = 'transparent'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p style={{ marginTop: 16, fontSize: 11, color: C.MUTED, textAlign: 'center', letterSpacing: '0.06em' }}>
          {a.footer}
        </p>
      </main>
    </div>
  );
}
