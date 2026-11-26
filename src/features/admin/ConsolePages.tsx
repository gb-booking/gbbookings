import { useEffect, useState, type ReactNode } from 'react';
import { Download, LoaderCircle, RefreshCw } from 'lucide-react';
import { api, type CustomRole, type FraudCase, type PaymentRequest, type PlatformReport } from '../../shared/api/api';
import DateInput from '../../shared/components/DateInput';
import Select from '../../shared/components/Select';
import { toast } from '../../shared/components/Toaster';
import { useReasonDialog } from '../../shared/components/ReasonDialog';
import { AiSuggestionTools, AssistantChat } from '../vendor/AiTools';

export const card = 'rounded-2xl border border-[#E1E5DE] bg-white p-4 sm:p-6';
export const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
export const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#006F3C] px-4 text-sm font-semibold text-white hover:bg-[#005c32] disabled:opacity-50';
export const field = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/15';
export const pkr = (value: number) => `PKR ${Math.round(value).toLocaleString('en-PK')}`;
const when = (value?: string) => value ? new Date(value).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
const pkDate = (date: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);

/** Loads once per `deps` change; `reload()` fetches again. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    load().then((next) => active && setValue(next)).catch((reason: Error) => active && setError(reason.message));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, revision]);
  return { value, error, reload: () => setRevision((current) => current + 1) };
}

export function Loading({ error, children, ready }: { error: string; ready: boolean; children: ReactNode }) {
  if (error) return <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  if (!ready) return <div className="flex justify-center py-10"><LoaderCircle className="size-6 animate-spin text-[#006F3C]" aria-label="Loading" /></div>;
  return <>{children}</>;
}

/** Table with a header row; `empty` shows when there are no rows. */
export function Table({ head, rows, empty = 'Nothing here yet.' }: { head: string[]; rows: ReactNode[][]; empty?: string }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
    <table className="w-full min-w-160 text-left text-sm">
      <thead className="bg-slate-50 text-xs text-slate-500"><tr>{head.map((label) => <th key={label} scope="col" className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">
        {rows.map((cells, index) => <tr key={index} className="align-top">{cells.map((cell, at) => <td key={at} className="px-4 py-3">{cell}</td>)}</tr>)}
        {rows.length === 0 && <tr><td colSpan={head.length} className="px-4 py-8 text-center text-slate-500">{empty}</td></tr>}
      </tbody>
    </table>
  </div>;
}

/** Saves rows as a CSV file, made in the browser. */
export function downloadCsv(name: string, head: string[], rows: Array<Array<string | number | undefined>>) {
  const cell = (value: string | number | undefined) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const url = URL.createObjectURL(new Blob([[head, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv' }));
  Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` }).click();
  URL.revokeObjectURL(url);
}

const Tile = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) =>
  <div className="rounded-xl border border-slate-200 bg-white p-5"><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</div>;

/* ───────── Reports ───────── */
export function ReportsPage() {
  const today = pkDate(new Date());
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const { value: report, error } = useLoad<PlatformReport>(() => api.console.report(from, to), [from, to]);
  const section = (title: string, csv: () => void, body: ReactNode) => <section className={`${card} space-y-3`}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{title}</h2><button type="button" className={button} onClick={csv}><Download className="size-4" />Export CSV</button></div>{body}</section>;
  const name = (kind: string) => `gbbookings-${kind}-${from}-to-${to}`;
  return <div className="space-y-5">
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Stays starting from<DateInput value={from} max={to} onChange={(event) => setFrom(event.target.value)} className={field} /></label>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">to<DateInput value={to} min={from} onChange={(event) => setTo(event.target.value)} className={field} /></label>
    </div>
    <Loading error={error} ready={Boolean(report)}>{report && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Bookings" value={report.totals.bookings} hint={`${report.totals.paidOnline} paid online`} />
        <Tile label="Revenue" value={pkr(report.totals.revenue)} hint="Confirmed and completed" />
        <Tile label="GBBookings take" value={pkr(report.totals.commission)} hint={`Includes ${pkr(report.totals.serviceFees)} service fees`} />
        <Tile label="Cancelled" value={report.totals.cancelled} hint={report.totals.bookings ? `${Math.round((report.totals.cancelled / report.totals.bookings) * 100)}% of bookings` : undefined} />
      </div>
      {section('Bookings, revenue, cancellations and occupancy by product', () => downloadCsv(name('products'), ['Product', 'Bookings', 'Cancelled', 'No-shows', 'Revenue PKR', 'Commission PKR', 'Refunds PKR', 'Nights or days sold'], report.byProduct.map((row) => [row.type, row.bookings, row.cancelled, row.noShows, row.revenue, row.commission, row.refunds, row.unitsSold])),
        <Table head={['Product', 'Bookings', 'Cancelled', 'No-shows', 'Revenue', 'Commission', 'Refunds', 'Nights / days sold']} rows={report.byProduct.map((row) => [<span className="font-semibold capitalize">{row.type}s</span>, row.bookings, row.cancelled, row.noShows, pkr(row.revenue), pkr(row.commission), pkr(row.refunds), row.unitsSold])} />)}
      <div className="grid gap-5 xl:grid-cols-2">
        {section('Refunds', () => downloadCsv(name('refunds'), ['Refunds', 'Sent PKR', 'Still to send PKR'], [[report.refunds.count, report.refunds.sent, report.refunds.waiting]]),
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3"><Tile label="Refunds" value={report.refunds.count} /><Tile label="Sent" value={pkr(report.refunds.sent)} /><Tile label="Still to send" value={pkr(report.refunds.waiting)} /></div>)}
        {section('Payouts settled in these dates', () => downloadCsv(name('payouts'), ['Statements', 'Paid to partners PKR', 'Received from partners PKR'], [[report.payouts.settled, report.payouts.paidToPartners, report.payouts.receivedFromPartners]]),
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3"><Tile label="Statements" value={report.payouts.settled} /><Tile label="Paid to partners" value={pkr(report.payouts.paidToPartners)} /><Tile label="From partners" value={pkr(report.payouts.receivedFromPartners)} /></div>)}
      </div>
      {section('Popular destinations', () => downloadCsv(name('destinations'), ['Place', 'Bookings', 'Revenue PKR'], report.destinations.map((row) => [row.place, row.bookings, row.revenue])),
        <Table head={['Place', 'Bookings', 'Revenue']} rows={report.destinations.map((row) => [row.place, row.bookings, pkr(row.revenue)])} empty="No bookings in these dates." />)}
      <p className="text-xs text-slate-500">Bookings are counted by the date the stay, rental or tour starts. Occupancy per property is in each partner's own Reports.</p>
    </>}</Loading>
  </div>;
}

/* ───────── Payment requests (staff view) ───────── */
const REQUEST_TONE: Record<PaymentRequest['status'], string> = { draft: 'bg-slate-100 text-slate-700', sent: 'bg-sky-50 text-sky-800', overdue: 'bg-rose-50 text-rose-700', paid: 'bg-emerald-50 text-emerald-800', cancelled: 'bg-slate-100 text-slate-500' };
export const RequestStatus = ({ status }: { status: PaymentRequest['status'] }) => <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${REQUEST_TONE[status]}`}>{status}</span>;
export function PaymentRequestsPage() {
  const [status, setStatus] = useState('');
  const { value, error } = useLoad(() => api.console.paymentRequests(status || undefined), [status]);
  return <div className="space-y-4">
    <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
      <option value="">All statuses</option>{['draft', 'sent', 'overdue', 'paid', 'cancelled'].map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}
    </Select>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Booking', 'Partner', 'Guest', 'Type', 'Amount', 'Due', 'Status']} empty="No payment requests."
        rows={(value ?? []).map((item) => [<span className="font-mono text-xs">{item.bookingReference}</span>, item.partnerName, item.guestName, item.typeLabel, pkr(item.amount), item.dueDate, <RequestStatus status={item.status} />])} />
    </Loading>
  </div>;
}

/* ───────── Fraud review ───────── */
const RISK_TONE = { low: 'text-emerald-700', medium: 'text-amber-700', high: 'text-rose-700', critical: 'text-rose-900 font-semibold' };
export function FraudPage() {
  const { value, error, reload } = useLoad(() => api.console.fraudCases());
  const { askReason, dialog } = useReasonDialog();
  const [busy, setBusy] = useState(false);
  const scan = async () => { setBusy(true); try { const result = await api.console.fraudScan(); toast(`Scan finished: ${result.found} rule hit(s).`); reload(); } catch (reason) { toast((reason as Error).message, 'error'); } finally { setBusy(false); } };
  const decide = async (item: FraudCase, status: 'under_review' | 'cleared' | 'confirmed') => {
    const note = await askReason({ title: `${status === 'under_review' ? 'Start reviewing' : status === 'cleared' ? 'Clear' : 'Confirm'}: ${item.subject}`, confirmLabel: 'Save', noteLabel: 'What you found', description: status === 'confirmed' ? 'Confirming records your finding only. Suspending an account is a separate step under Users or Partners, and the person can appeal.' : 'Your note is kept in the case history.' });
    if (!note) return;
    try { await api.console.fraudDecide(item.id, status, note); reload(); } catch (reason) { toast((reason as Error).message, 'error'); }
  };
  const open = (value ?? []).filter((item) => item.status === 'open' || item.status === 'under_review');
  return <div className="space-y-5">
    {dialog}
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Risk scores come from fixed rules and are advice, not proof. Nothing is banned or suspended automatically: every case needs a person, and guests and partners can appeal.</p>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">{(['low', 'medium', 'high', 'critical'] as const).map((risk) => <Tile key={risk} label={`${risk[0].toUpperCase()}${risk.slice(1)} risk`} value={open.filter((item) => item.risk === risk).length} />)}</div>
      <button type="button" className={primary} disabled={busy} onClick={() => void scan()}><RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />Run scan now</button>
    </div>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Rule', 'Subject', 'Booking', 'Score', 'Reason', 'Status', 'Action']} empty="No cases. Run a scan to check the last 30 days."
        rows={(value ?? []).map((item) => [item.rule, item.subject, item.bookingRef ?? '—', <span className={RISK_TONE[item.risk]}>{item.score} · {item.risk}</span>, <span className="text-slate-600">{item.reason}</span>, <span className="capitalize">{item.status.replace('_', ' ')}</span>,
          <Select aria-label={`Action on ${item.subject}`} value="" onChange={(event) => void decide(item, event.target.value as any)} className={field}>
            <option value="">Choose action</option><option value="under_review">Start review</option><option value="cleared">Clear</option><option value="confirmed">Confirm finding</option>
          </Select>])} />
    </Loading>
    {!!value?.length && <section className={card}><h2 className="mb-3 font-bold">Investigation history</h2>
      <ul className="space-y-1.5 text-sm">{value.flatMap((item) => item.history.map((event) => ({ ...event, subject: item.subject }))).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30)
        .map((event, index) => <li key={index} className="flex flex-wrap gap-x-3 text-slate-700"><span className="text-slate-500">{when(event.at)}</span><span className="font-semibold">{event.subject}</span><span>{event.by}: {event.text}</span></li>)}</ul>
    </section>}
  </div>;
}

/* ───────── CRM and loyalty ───────── */
export function CustomersPage({ loyalty = false }: { loyalty?: boolean }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const { value, error } = useLoad(() => api.console.customers({ search: query || undefined, page }), [query, page]);
  const rows = value?.data ?? [];
  return <div className="space-y-4">
    {loyalty && <p className="text-sm text-slate-600">One point for every PKR 100 spent on completed trips. Bronze to start, Silver from PKR 150,000, Gold from PKR 500,000. Points cannot be spent yet.</p>}
    <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); setPage(1); }}>
      <input type="search" aria-label="Search by name or email" placeholder="Name or email" value={search} onChange={(event) => setSearch(event.target.value)} className={`${field} w-64`} />
      <button className={button}>Search</button>
      <button type="button" className={button} disabled={!rows.length} onClick={() => downloadCsv(loyalty ? 'gbbookings-loyalty' : 'gbbookings-customers', ['Name', 'Email', 'Tier', 'Points', 'Referral code', 'Lifetime value PKR', 'Bookings', 'Tags'], rows.map((row) => [row.name, row.email, row.tier, row.points, row.referralCode, row.lifetimeValue, row.bookings, row.tags.join(' ')]))}><Download className="size-4" />Export CSV</button>
    </form>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={loyalty ? ['Member', 'Points', 'Tier', 'Referral code', 'Status'] : ['Customer', 'Tier', 'Lifetime value', 'Bookings', 'Tags', 'Status']} empty="No customers match."
        rows={rows.map((row) => loyalty
          ? [<><p className="font-semibold">{row.name}</p><p className="text-xs text-slate-500">{row.email}</p></>, row.points.toLocaleString(), row.tier, <span className="font-mono text-xs">{row.referralCode}</span>, row.status]
          : [<><p className="font-semibold">{row.name}</p><p className="text-xs text-slate-500">{row.email}{row.phone ? ` · ${row.phone}` : ''}</p></>, row.tier, pkr(row.lifetimeValue), `${row.completed} completed of ${row.bookings}`, row.tags.join(', '), row.vip ? 'VIP' : row.status])} />
      {value && value.pagination.pages > 1 && <div className="flex justify-end gap-2"><button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className={button} disabled={page >= value.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </Loading>
  </div>;
}

/* ───────── Tasks ───────── */
export function TasksPage() {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [status, setStatus] = useState<'open' | 'done'>('open');
  const { value, error, reload } = useLoad(() => api.console.tasks(scope, status), [scope, status]);
  const { value: staff } = useLoad(() => api.console.staffDirectory());
  const [draft, setDraft] = useState({ title: '', assigneeId: '', dueDate: '', note: '' });
  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    try { await api.console.createTask({ title: draft.title, assigneeId: draft.assigneeId, dueDate: draft.dueDate || undefined, note: draft.note || undefined }); setDraft({ title: '', assigneeId: draft.assigneeId, dueDate: '', note: '' }); reload(); toast('Task added.'); }
    catch (reason) { toast((reason as Error).message, 'error'); }
  };
  const act = async (id: string, action: 'done' | 'reopen') => { try { await api.console.taskAction(id, action); reload(); } catch (reason) { toast((reason as Error).message, 'error'); } };
  return <div className="space-y-5">
    <form onSubmit={add} className={`${card} grid gap-3 sm:grid-cols-4`}>
      <h2 className="font-bold sm:col-span-4">New task</h2>
      <label className="text-xs font-semibold sm:col-span-2">What needs doing<input required minLength={3} maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} className={`${field} mt-1 w-full`} /></label>
      <label className="text-xs font-semibold">For<Select required value={draft.assigneeId} onChange={(event) => setDraft({ ...draft, assigneeId: event.target.value })} className={`${field} mt-1 w-full`}><option value="">Choose…</option>{staff?.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</Select></label>
      <label className="text-xs font-semibold">Due<DateInput value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} className={`${field} mt-1 w-full`} /></label>
      <label className="text-xs font-semibold sm:col-span-3">Note<input maxLength={2000} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className={`${field} mt-1 w-full`} /></label>
      <button className={`${primary} self-end`}>Add task</button>
    </form>
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Whose tasks" value={scope} onChange={(event) => setScope(event.target.value as any)} className={field}><option value="mine">My tasks</option><option value="all">Everyone's tasks</option></Select>
      <Select aria-label="Task status" value={status} onChange={(event) => setStatus(event.target.value as any)} className={field}><option value="open">Open</option><option value="done">Done</option></Select>
    </div>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Task', 'For', 'Due', 'From', '']} empty={status === 'open' ? 'Nothing open.' : 'Nothing done yet.'}
        rows={(value ?? []).map((task) => [<><p className="font-semibold">{task.title}</p>{task.note && <p className="text-xs text-slate-500">{task.note}</p>}</>, task.assignee, <span className={task.status === 'open' && task.dueDate && task.dueDate < pkDate(new Date()) ? 'font-semibold text-rose-700' : ''}>{task.dueDate ?? '—'}</span>, task.createdBy,
          <button type="button" className={button} onClick={() => void act(task.id, task.status === 'open' ? 'done' : 'reopen')}>{task.status === 'open' ? 'Mark done' : 'Reopen'}</button>])} />
    </Loading>
  </div>;
}

/* ───────── Notifications ───────── */
export function NotificationsPage({ onOpen }: { onOpen: (page: string) => void }) {
  const { value, error, reload } = useLoad(() => api.console.notifications());
  return <div className="space-y-3">
    <button type="button" className={button} onClick={reload}><RefreshCw className="size-4" />Refresh</button>
    <Loading error={error} ready={Boolean(value)}>
      {value?.length === 0 ? <p className={`${card} text-center text-sm text-slate-500`}>Nothing needs you right now.</p>
        : <ul className="space-y-2">{value?.map((item) => <li key={item.text}><button type="button" onClick={() => onOpen(item.page)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-[#006F3C]">
          <span className="font-semibold">{item.text}</span><span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-bold text-amber-900">{item.count}</span></button></li>)}</ul>}
    </Loading>
  </div>;
}

/* ───────── Security center ───────── */
export function SecurityCenterPage() {
  const { value, error, reload } = useLoad(() => api.console.securityCenter());
  const act = async (id: string, action: 'sign-out' | 'unlock') => { try { await api.console.securityAction(id, action); toast(action === 'unlock' ? 'Account unlocked.' : 'Signed out on every device.'); reload(); } catch (reason) { toast((reason as Error).message, 'error'); } };
  return <Loading error={error} ready={Boolean(value)}>
    <Table head={['Staff member', 'Roles', 'Two-step sign-in', 'Devices signed in', 'Failed sign-ins', 'Password changed', '']}
      rows={(value ?? []).map((user) => [<><p className="font-semibold">{user.name}</p><p className="text-xs text-slate-500">{user.email} · {user.status}</p></>, user.roles.join(', ').replace(/_/g, ' '), user.twoStep, user.activeSessions,
        <span className={user.locked ? 'font-semibold text-rose-700' : ''}>{user.failedLogins}{user.locked ? ' · locked' : ''}</span>, when(user.passwordChangedAt),
        <div className="flex flex-wrap gap-2">{user.locked && <button type="button" className={button} onClick={() => void act(user.id, 'unlock')}>Unlock</button>}{user.activeSessions > 0 && <button type="button" className={button} onClick={() => void act(user.id, 'sign-out')}>Sign out everywhere</button>}</div>])} />
  </Loading>;
}

/* ───────── Read-only lists ───────── */
export function AutomationsPage() {
  const { value, error } = useLoad(() => api.console.automations());
  return <Loading error={error} ready={Boolean(value)}><Table head={['Automation', 'Runs', 'What it does']} rows={(value ?? []).map((item) => [<span className="font-semibold">{item.name}</span>, item.schedule, <span className="text-slate-600">{item.description}</span>])} /></Loading>;
}

export function ChannelFeedsPage() {
  const { value, error } = useLoad(() => api.console.channelFeeds());
  const failing = (value ?? []).filter((item) => item.error).length;
  return <Loading error={error} ready={Boolean(value)}>
    <div className="space-y-3">
      {failing > 0 && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{failing} calendar link(s) failed their last sync. The partner sees the same error and can fix the link.</p>}
      <Table head={['Listing', 'Room or unit', 'Channel', 'Last sync', 'Problem']} empty="No partner has linked another booking site's calendar yet."
        rows={(value ?? []).map((item) => [item.listing, item.room, item.channel, when(item.lastSyncAt), item.error ? <span className="text-rose-700">{item.error}</span> : item.conflicts ? <span className="text-amber-700">{item.conflicts} double-booked night(s)</span> : <span className="text-emerald-700">OK</span>])} />
    </div>
  </Loading>;
}

export function MediaPage() {
  const [kind, setKind] = useState('');
  const [page, setPage] = useState(1);
  const { value, error } = useLoad(() => api.console.media({ kind: kind || undefined, page }), [kind, page]);
  return <div className="space-y-4">
    <Select aria-label="Kind of file" value={kind} onChange={(event) => { setKind(event.target.value); setPage(1); }} className={field}><option value="">All files</option><option value="image">Photos</option><option value="document">Documents</option></Select>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['File', 'Partner', 'Type', 'Size', 'Status', 'Uploaded']} empty="No files."
        rows={(value?.data ?? []).map((item) => [item.url ? <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt="" className="h-12 w-16 rounded object-cover" /></a> : <span className="text-xs text-slate-500">Private document</span>, item.partner ?? '—', item.mimeType, `${Math.round(item.bytes / 1024)} KB`, item.status, when(item.createdAt)])} />
      {value && value.pagination.pages > 1 && <div className="flex justify-end gap-2"><button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button type="button" className={button} disabled={page >= value.pagination.pages} onClick={() => setPage(page + 1)}>Next</button></div>}
    </Loading>
    <p className="text-xs text-slate-500">Identity and business documents stay private; open them from the partner's application under Partners.</p>
  </div>;
}

export function DestinationsPage() {
  const { value, error } = useLoad(() => api.console.destinations());
  return <Loading error={error} ready={Boolean(value)}>
    <Table head={['Destination', 'Live listings', 'Hotels', 'Homestays', 'Cars', 'Tours']} rows={(value ?? []).map((row) => [<span className="font-semibold">{row.name}</span>, row.total, row.hotel, row.homestay, row.car, row.tour])} />
    <p className="mt-3 text-xs text-slate-500">These are the destinations on the website. Adding one is a website change; ask a developer.</p>
  </Loading>;
}

export function GuidesPage() {
  const { value, error } = useLoad(() => api.console.guides());
  return <Loading error={error} ready={Boolean(value)}>
    <Table head={['Guide or company', 'Kind', 'City', 'Guide licence', 'Tours', 'Status']} empty="No tour partners yet."
      rows={(value ?? []).map((row) => [<><p className="font-semibold">{row.name}</p><p className="text-xs text-slate-500">{row.email}{row.phone ? ` · ${row.phone}` : ''}</p></>, row.kind, row.city ?? '—', row.licence ? 'Uploaded' : 'Missing', `${row.liveTours} live of ${row.tours}`, <span className="capitalize">{row.status}</span>])} />
  </Loading>;
}

export function MarketingPage() {
  const { value, error } = useLoad(() => api.console.subscribers());
  return <div className="space-y-4">
    <p className="text-sm text-slate-600">People who asked for GBBookings news and deals. Send campaigns from a mailing tool with this list, and include an unsubscribe link.</p>
    <a href="/api/v1/console/subscribers?format=csv" className={primary}><Download className="size-4" />Export subscribers (CSV)</a>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Email', 'Signed up from', 'Date']} empty="No subscribers yet." rows={(value ?? []).map((row) => [row.email, row.source, when(row.subscribedAt)])} />
    </Loading>
  </div>;
}

/* ───────── Custom roles ───────── */
export function CustomRolesPage() {
  const { value, error, reload } = useLoad(() => api.console.customRoles());
  const { value: catalogue } = useLoad(() => api.admin.getPermissions());
  const [editing, setEditing] = useState<Partial<CustomRole> | null>(null);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    try { await api.console.saveCustomRole({ name: editing.name ?? '', permissions: editing.permissions ?? [], status: editing.status ?? 'active' }, editing.id); setEditing(null); reload(); toast('Role saved. It applies on each staff member’s next page load.'); }
    catch (reason) { toast((reason as Error).message, 'error'); }
  };
  const staffPermissions = Object.keys(catalogue?.descriptions ?? {}).filter((key) => !key.endsWith(':own') && !key.startsWith('profile:') && key !== 'listing:read');
  return <div className="space-y-5">
    <button type="button" className={primary} onClick={() => setEditing({ permissions: [], status: 'active' })}>New role</button>
    {editing && <form onSubmit={save} className={`${card} space-y-4`}>
      <label className="block text-sm font-semibold">Role name<input required minLength={2} maxLength={60} value={editing.name ?? ''} onChange={(event) => setEditing({ ...editing, name: event.target.value })} className={`${field} mt-1 block w-72`} placeholder="Regional manager" /></label>
      <fieldset><legend className="text-sm font-semibold">Can do</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">
        {staffPermissions.map((key) => <label key={key} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[#006F3C]" checked={editing.permissions?.includes(key) ?? false}
          onChange={(event) => setEditing({ ...editing, permissions: event.target.checked ? [...(editing.permissions ?? []), key] : (editing.permissions ?? []).filter((item) => item !== key) })} />
          <span><span className="font-semibold capitalize">{key.replace(/[:_]/g, ' ')}</span><span className="block text-xs text-slate-500">{catalogue?.descriptions[key]}</span></span></label>)}
      </div></fieldset>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#006F3C]" checked={editing.status !== 'disabled'} onChange={(event) => setEditing({ ...editing, status: event.target.checked ? 'active' : 'disabled' })} />Active (a disabled role grants nothing)</label>
      <div className="flex gap-2"><button className={primary}>Save role</button><button type="button" className={button} onClick={() => setEditing(null)}>Cancel</button></div>
    </form>}
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Role', 'Staff', 'Can do', 'Status', '']} empty="No custom roles. The four built-in roles are on the Permissions page."
        rows={(value ?? []).map((role) => [<span className="font-semibold">{role.name}</span>, role.users, <span className="text-xs text-slate-600">{role.permissions.map((key) => key.replace(/[:_]/g, ' ')).join(', ') || 'Nothing yet'}</span>, <span className="capitalize">{role.status}</span>,
          <button type="button" className={button} onClick={() => setEditing(role)}>Edit</button>])} />
    </Loading>
    <p className="text-xs text-slate-500">Give someone a custom role from Staff: invite them and pick the role.</p>
  </div>;
}

/* ───────── AI ───────── */
export function AiControlPage() {
  const { value, error, reload } = useLoad(() => api.console.aiControl());
  const toggle = async (feature: string, enabled: boolean) => { try { await api.console.setAiFeature(feature, enabled); reload(); } catch (reason) { toast((reason as Error).message, 'error'); } };
  const total = (value ?? []).reduce((sum, row) => ({ requests: sum.requests + row.requests, tokens: sum.tokens + row.tokens }), { requests: 0, tokens: 0 });
  return <Loading error={error} ready={Boolean(value)}>
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><Tile label="Requests, last 30 days" value={total.requests.toLocaleString()} /><Tile label="Tokens, last 30 days" value={total.tokens.toLocaleString()} hint="Check cost in the Google AI Studio billing page." /></div>
      <Table head={['Feature', 'Requests', 'Tokens', 'Error rate', 'On']}
        rows={(value ?? []).map((row) => [<span className="font-semibold">{row.label}</span>, row.requests, row.tokens.toLocaleString(), `${row.errorRate}%`,
          <input type="checkbox" aria-label={`${row.label} on`} className="size-5 accent-[#006F3C]" checked={row.enabled} onChange={(event) => void toggle(row.feature, event.target.checked)} />])} />
      <p className="text-xs text-slate-500">AI only suggests. A person approves every change to prices, accounts or reviews.</p>
    </div>
  </Loading>;
}

export function ForecastPage() {
  const { value, error } = useLoad(() => api.console.forecast());
  return <Loading error={error} ready={Boolean(value)}>{value && <div className="space-y-3">
    <p className="text-sm text-slate-600">{value.basis}</p>
    <Table head={['Week of', 'Booked', 'Booked value', 'Booked commission', 'Projected new bookings', 'Projected value', 'Projected commission']}
      rows={value.weeks.map((week) => [week.weekOf, week.bookedCount, pkr(week.bookedValue), pkr(week.bookedCommission), week.projectedCount, pkr(week.projectedValue), pkr(week.projectedCommission)])} />
  </div>}</Loading>;
}

/** Support assistant: pick an open case, get a draft reply to copy into the Support page. */
export function AiSupportPage() {
  const { value: cases, error } = useLoad(() => api.admin.listSupportCases('open').then((result) => result.data));
  const [draft, setDraft] = useState<{ caseId: string; reply: string } | null>(null);
  const [busy, setBusy] = useState('');
  const suggest = async (caseId: string) => { setBusy(caseId); try { setDraft({ caseId, ...await api.console.aiSupportReply(caseId) }); } catch (reason) { toast((reason as Error).message, 'error'); } finally { setBusy(''); } };
  return <Loading error={error} ready={Boolean(cases)}>
    <div className="space-y-3">
      <p className="text-sm text-slate-600">A draft for you to edit. Copy it into the reply box on Tickets &amp; messages; nothing is sent from here.</p>
      {cases?.length === 0 && <p className={`${card} text-center text-sm text-slate-500`}>No open support cases.</p>}
      {cases?.map((item) => <div key={item.id} className={`${card} space-y-2`}>
        <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{item.booking?.reference ?? 'Booking'} · {item.booking?.customerName ?? 'Guest'}</p><button type="button" className={button} disabled={busy === item.id} onClick={() => void suggest(item.id)}>{busy === item.id ? 'Thinking…' : 'Suggest a reply'}</button></div>
        <p className="text-sm text-slate-600">{item.messages.at(-1)?.body}</p>
        {draft?.caseId === item.id && <div className="space-y-2 rounded-lg bg-emerald-50 p-3"><p className="whitespace-pre-wrap text-sm">{draft.reply}</p>
          <button type="button" className={button} onClick={() => void navigator.clipboard.writeText(draft.reply).then(() => toast('Copied.'))}>Copy</button></div>}
      </div>)}
    </div>
  </Loading>;
}

/** The AI center: every AI tool in one place for staff. */
export function AiCenterPage() {
  const [tab, setTab] = useState<'listing' | 'support' | 'forecast' | 'vendor' | 'assistant'>('listing');
  const { value: vendors } = useLoad(() => api.admin.listVendors({ status: 'approved', limit: 100 }));
  const [vendorId, setVendorId] = useState('');
  const [insight, setInsight] = useState<{ summary: string; risks: string[]; actions: string[] } | null>(null);
  const tabs = [['listing', 'Pricing, content & reviews'], ['support', 'Support assistant'], ['forecast', 'Forecasting'], ['vendor', 'Vendor intelligence'], ['assistant', 'Assistant']] as const;
  return <div className="space-y-5">
    <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Suggestions only. A person approves every change; nothing is applied automatically. The trip planner and recommendations are on the website for guests.</p>
    <div className="flex flex-wrap gap-2" role="tablist">{tabs.map(([id, text]) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
      className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${tab === id ? 'border-[#006F3C] bg-[#006F3C] text-white' : 'border-slate-300 bg-white text-slate-700'}`}>{text}</button>)}</div>
    {tab === 'listing' && <AiSuggestionTools staff />}
    {tab === 'support' && <AiSupportPage />}
    {tab === 'forecast' && <ForecastPage />}
    {tab === 'assistant' && <AssistantChat />}
    {tab === 'vendor' && <div className={`${card} space-y-3`}>
      <div className="flex flex-wrap gap-2">
        <Select aria-label="Partner" value={vendorId} onChange={(event) => { setVendorId(event.target.value); setInsight(null); }} className={field}><option value="">Choose a partner…</option>{vendors?.data.map((vendor) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}</Select>
        <button type="button" className={primary} disabled={!vendorId} onClick={() => void api.console.aiVendor(vendorId).then(setInsight).catch((reason: Error) => toast(reason.message, 'error'))}>Brief me</button>
      </div>
      {insight && <div className="space-y-2 text-sm"><p>{insight.summary}</p>
        {!!insight.risks.length && <><p className="font-semibold">Risks</p><ul className="list-disc pl-5">{insight.risks.map((item) => <li key={item}>{item}</li>)}</ul></>}
        {!!insight.actions.length && <><p className="font-semibold">Suggested actions</p><ul className="list-disc pl-5">{insight.actions.map((item) => <li key={item}>{item}</li>)}</ul></>}</div>}
    </div>}
  </div>;
}
