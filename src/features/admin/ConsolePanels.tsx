import { useEffect, useState } from 'react';
import { CheckCircle2, Clock, LoaderCircle } from 'lucide-react';
import { api, type AuditEntry, type Paginated } from '../../shared/api/api';

const card = 'rounded-2xl border border-[#E1E5DE] bg-white p-4 sm:p-6';
const pagerButton = 'min-h-11 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const words = (value: string) => value.replace(/[._:]/g, ' ');

export const ROLE_NAMES: Record<string, string> = {
  admin: 'Super Admin', operations_manager: 'Operations Manager', finance_manager: 'Finance Manager', support_agent: 'Support Agent', custom_staff: 'Staff (custom role)',
  vendor_owner: 'Partner owner', vendor_staff: 'Partner staff', customer: 'Customer',
};

/** Roles against permissions. Defined in code on the server, so this page shows it rather than edits it. */
export function PermissionsPanel() {
  const [data, setData] = useState<Awaited<ReturnType<typeof api.admin.getPermissions>> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api.admin.getPermissions().then(setData).catch((reason: Error) => setError(reason.message)); }, []);
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  if (!data) return <LoaderCircle className="mx-auto size-6 animate-spin text-[#006F3C]" aria-label="Loading" />;
  const keys = Object.keys(data.descriptions);
  return <section className={`${card} overflow-x-auto`}>
    <table className="w-full min-w-[760px] text-sm">
      <thead><tr className="text-left text-xs text-slate-500"><th className="py-2 pr-3">Role</th>{keys.map((key) => <th key={key} title={data.descriptions[key]} className="px-1 py-2 font-semibold capitalize">{words(key)}</th>)}</tr></thead>
      <tbody>{Object.entries(data.roles).map(([role, granted]) => <tr key={role} className="border-t border-slate-100">
        <th scope="row" className="py-2.5 pr-3 text-left font-semibold">{ROLE_NAMES[role] ?? words(role)}</th>
        {keys.map((key) => <td key={key} className="px-1 text-center">{granted.includes(key)
          ? <CheckCircle2 className="mx-auto size-4 text-emerald-700" aria-label="Allowed" />
          : <span className="text-slate-300" aria-label="Not allowed">–</span>}</td>)}
      </tr>)}</tbody>
    </table>
  </section>;
}

/** Audit logs, the sign-in security log, or the signed-in staff member's own activity. */
export function AuditPanel({ kind, mine = false }: { kind: 'activity' | 'security'; mine?: boolean }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<AuditEntry> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setResult(null); setError('');
    api.admin.listAudit({ kind, mine: mine ? '1' : undefined, page }).then((next) => active && setResult(next)).catch((reason: Error) => active && setError(reason.message));
    return () => { active = false; };
  }, [kind, mine, page]);
  return <section className={card}>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {!result && !error && <LoaderCircle className="mx-auto size-6 animate-spin text-[#006F3C]" aria-label="Loading" />}
    {result?.data.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nothing recorded yet.</p>}
    {!!result?.data.length && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
      <thead><tr className="text-left text-xs text-slate-500"><th className="py-2 pr-3">Event</th><th className="pr-3">By</th><th className="pr-3">{kind === 'security' ? 'Device and IP' : 'Record'}</th><th>When</th></tr></thead>
      <tbody>{result.data.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top">
        <td className="py-2.5 pr-3 font-semibold capitalize">{words(row.action)}</td>
        <td className="py-2.5 pr-3">{row.actor}</td>
        <td className="max-w-xs truncate py-2.5 pr-3 text-slate-600">{kind === 'security' ? [row.userAgent, row.ipAddress].filter(Boolean).join(' · ') || '—' : `${words(row.resourceType)}${row.resourceId ? ` ${row.resourceId}` : ''}`}</td>
        <td className="whitespace-nowrap py-2.5 text-slate-600">{new Date(row.at).toLocaleString('en-PK')}</td>
      </tr>)}</tbody>
    </table></div>}
    {result && result.pagination.pages > 1 && <div className="flex items-center justify-end gap-3 pt-4 text-sm">
      <button type="button" className={pagerButton} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span className="text-slate-600">Page {page} of {result.pagination.pages}</span>
      <button type="button" className={pagerButton} disabled={page >= result.pagination.pages} onClick={() => setPage(page + 1)}>Next</button>
    </div>}
  </section>;
}

/** Honest status of every page in this role's menu. */
export function FeatureAuditPanel({ items }: { items: Array<{ label: string; built: boolean }> }) {
  return <section className={card}>
    <ul className="divide-y divide-slate-100">{items.map((item) => <li key={item.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
      <span className="font-semibold">{item.label}</span>
      {item.built ? <span className="inline-flex items-center gap-1.5 text-emerald-800"><CheckCircle2 className="size-4" />Working, with live data</span>
        : <span className="inline-flex items-center gap-1.5 text-amber-800"><Clock className="size-4" />Not built yet</span>}
    </li>)}</ul>
  </section>;
}
