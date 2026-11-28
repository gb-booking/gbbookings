import { useState } from 'react';
import { Briefcase, FileText, ShieldCheck } from 'lucide-react';
import { api, type PaymentRequest, type PayoutStatement, type VendorProfile } from '../../shared/api/api';
import DateInput from '../../shared/components/DateInput';
import Select from '../../shared/components/Select';
import Statement, { netLabel } from '../../shared/components/Statement';
import { toast } from '../../shared/components/Toaster';
import { button, field, Loading, pkr, primary, RequestStatus, Table, useLoad } from '../admin/ConsolePages';
import { formatDateForDisplay } from '../../shared/utils/date';
import type { VendorTab } from './VendorWorkspace';

const TYPES: Array<[PaymentRequest['type'], string]> = [
  ['remaining_balance', 'Remaining balance'], ['booking_advance', 'Booking advance'], ['partial_payment', 'Partial payment'],
  ['cancellation_fee', 'Cancellation fee'], ['additional_service', 'Additional service'],
];

/** Ask a guest for money on a booking. The partner collects it and marks it paid; GBBookings keeps the record. */
export function PartnerPaymentRequests() {
  const [status, setStatus] = useState('');
  const { value, error, reload } = useLoad(() => api.partnerConsole.paymentRequests(status || undefined), [status]);
  const [draft, setDraft] = useState({ bookingReference: '', type: 'additional_service' as PaymentRequest['type'], amount: '', dueDate: '', note: '' });
  const [busy, setBusy] = useState(false);
  const create = async (send: boolean) => {
    setBusy(true);
    try {
      await api.partnerConsole.createPaymentRequest({ bookingReference: draft.bookingReference, type: draft.type, amount: Number(draft.amount), dueDate: draft.dueDate, note: draft.note || undefined, send });
      toast(send ? 'Sent. The guest has been emailed.' : 'Saved as a draft.');
      setDraft({ ...draft, bookingReference: '', amount: '', note: '' }); reload();
    } catch (reason) { toast((reason as Error).message, 'error'); } finally { setBusy(false); }
  };
  const act = async (id: string, action: 'send' | 'paid' | 'cancel') => { try { await api.partnerConsole.paymentRequestAction(id, action); reload(); } catch (reason) { toast((reason as Error).message, 'error'); } };
  const ready = draft.bookingReference.trim().length >= 4 && Number(draft.amount) > 0 && draft.dueDate;
  return <div className="space-y-5">
    <form onSubmit={(event) => { event.preventDefault(); void create(true); }} className="grid gap-3 rounded-2xl border border-[#E1E5DE] bg-white p-4 sm:grid-cols-3 sm:p-6">
      <h2 className="font-bold sm:col-span-3">New request</h2>
      <label className="text-xs font-semibold">Booking reference<input required value={draft.bookingReference} onChange={(event) => setDraft({ ...draft, bookingReference: event.target.value })} placeholder="GB-1A2B3C4D" className={`${field} mt-1 w-full font-mono uppercase`} /></label>
      <label className="text-xs font-semibold">For<Select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as PaymentRequest['type'] })} className={`${field} mt-1 w-full`}>{TYPES.map(([id, text]) => <option key={id} value={id}>{text}</option>)}</Select></label>
      <label className="text-xs font-semibold">Amount (PKR)<input required type="number" min={1} step={1} value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} className={`${field} mt-1 w-full`} /></label>
      <label className="text-xs font-semibold">Due by<DateInput required value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} className={`${field} mt-1 w-full`} /></label>
      <label className="text-xs font-semibold sm:col-span-2">Note to the guest<input maxLength={500} value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="e.g. Jeep to Deosai on 14 June" className={`${field} mt-1 w-full`} /></label>
      <p className="text-xs text-slate-500 sm:col-span-2">The guest is emailed and sees it in their account. They pay you directly, for example on arrival; mark it paid when you have the money.</p>
      <div className="flex gap-2"><button type="button" className={button} disabled={busy || !ready} onClick={() => void create(false)}>Save draft</button><button className={primary} disabled={busy || !ready}>Send</button></div>
    </form>
    <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)} className={field}>
      <option value="">All statuses</option>{['draft', 'sent', 'overdue', 'paid', 'cancelled'].map((item) => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}
    </Select>
    <Loading error={error} ready={Boolean(value)}>
      <Table head={['Booking', 'Guest', 'For', 'Amount', 'Due', 'Status', '']} empty="No payment requests yet."
        rows={(value ?? []).map((item) => [<span className="font-mono text-xs">{item.bookingReference}</span>, item.guestName, <>{item.typeLabel}{item.note && <p className="text-xs text-slate-500">{item.note}</p>}</>, pkr(item.amount), item.dueDate, <RequestStatus status={item.status} />,
          <div className="flex flex-wrap gap-2">
            {item.status === 'draft' && <button type="button" className={button} onClick={() => void act(item.id, 'send')}>Send</button>}
            {(item.status === 'sent' || item.status === 'overdue') && <button type="button" className={button} onClick={() => void act(item.id, 'paid')}>Mark paid</button>}
            {['draft', 'sent', 'overdue'].includes(item.status) && <button type="button" className={button} onClick={() => void act(item.id, 'cancel')}>Cancel</button>}
          </div>])} />
    </Loading>
  </div>;
}

/** Photos and documents the business uploaded, in one place. Uploading happens where each file is used. */
export function PartnerDocuments() {
  const [kind, setKind] = useState<'' | 'image' | 'document'>('');
  const [search, setSearch] = useState('');
  const { value, error } = useLoad(() => api.partnerConsole.documents(kind || undefined), [kind]);
  const shown = (value ?? []).filter((item) => !search || `${item.alt ?? ''} ${item.mimeType}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="space-y-4">
    <div className="flex flex-wrap gap-2">
      <Select aria-label="Kind of file" value={kind} onChange={(event) => setKind(event.target.value as any)} className={field}><option value="">All files</option><option value="image">Photos</option><option value="document">Documents</option></Select>
      <input type="search" aria-label="Search files" placeholder="Search files" value={search} onChange={(event) => setSearch(event.target.value)} className={field} />
    </div>
    <p className="text-xs text-slate-500">Add photos in each listing's Details &amp; photos, and documents in Business profile. Images and PDFs up to the upload limit shown there.</p>
    <Loading error={error} ready={Boolean(value)}>
      {shown.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No files yet.</p>
        : <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">{shown.map((item) => <li key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {item.kind === 'image' && item.url ? <a href={item.url} target="_blank" rel="noreferrer"><img src={item.url} alt={item.alt ?? ''} className="aspect-[4/3] w-full object-cover" /></a>
            : <div className="flex aspect-[4/3] items-center justify-center bg-slate-50"><FileText className="size-8 text-slate-400" aria-hidden="true" /></div>}
          <div className="p-2 text-xs text-slate-600"><p className="truncate font-semibold">{item.alt || item.mimeType}</p><p>{Math.round(item.bytes / 1024)} KB · {new Date(item.createdAt).toLocaleDateString('en-PK')}</p></div>
        </li>)}</ul>}
    </Loading>
  </div>;
}

/** Payout statements only: the counterpart to Payments & earnings, which also shows the live balance and unsettled bookings. */
export function VendorPayoutStatements() {
  const [statement, setStatement] = useState<PayoutStatement | null>(null);
  const [status, setStatus] = useState<'' | 'open' | 'settled'>('');
  const [error, setError] = useState('');
  const { value, error: loadError } = useLoad(() => api.getPartnerFinance(), []);
  const open = (id: string) => api.getPartnerStatement(id).then(setStatement).catch((reason: Error) => setError(reason.message));
  if (statement) return <Statement statement={statement} onClose={() => setStatement(null)} />;
  const payouts = (value?.payouts ?? []).filter((item) => !status || item.status === status);
  return <div className="space-y-4">
    {(error || loadError) && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error || loadError}</p>}
    <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value as any)} className={field}>
      <option value="">All statements</option><option value="open">Not settled yet</option><option value="settled">Settled</option>
    </Select>
    <Loading error={loadError} ready={Boolean(value)}>
      <Table head={['Statement', 'Issued', 'Bookings', 'Amount', 'Status', '']} empty="GBBookings has not issued a statement yet. Statements appear once your bookings settle."
        rows={payouts.map((item) => [<span className="font-mono text-xs">{item.reference}</span>, formatDateForDisplay(item.createdAt), item.bookings, <strong>{netLabel(item.net)}</strong>,
          item.status === 'settled' ? 'Settled' : 'Not settled yet',
          <button type="button" className={button} onClick={() => void open(item.id)}>View</button>])} />
    </Loading>
    <p className="text-xs text-slate-500">A positive amount means GBBookings pays you; a negative amount means you pay GBBookings the commission on money you collected. Each statement doubles as the commission invoice.</p>
  </div>;
}

/** Business details and account settings in one place, for hotel and homestay partners. */
export function VendorSettingsPage({ vendor, onTab }: { vendor: VendorProfile; onTab: (tab: VendorTab) => void }) {
  const address = [vendor.address?.line1, vendor.address?.city, vendor.address?.region].filter(Boolean).join(', ');
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="font-bold text-slate-900">Your business</h2>
      <dl className="mt-4 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {[['Business', vendor.name], ['Type', vendor.businessType.replace('_', ' ')], ['Email', vendor.email], ['Phone', vendor.phone || '—'],
          ['Registration no.', vendor.registrationNumber ?? '—'], ['NTN', vendor.taxNumber ?? '—'], ['Address', address || '—'],
          ['Status', vendor.status], ['Bank details', vendor.payoutProfile ? 'Saved' : 'Not added yet'],
        ].map(([term, value]) => <div key={term}><dt className="text-slate-500">{term}</dt><dd className="font-semibold capitalize">{value}</dd></div>)}
      </dl>
      {vendor.pendingChanges && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Business changes are waiting for GBBookings approval.</p>}
    </section>
    <div className="grid gap-4 sm:grid-cols-2">
      <button type="button" onClick={() => onTab('business')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-[#006F3C]">
        <Briefcase className="size-5 text-[#006F3C]" aria-hidden="true" />
        <span className="mt-2 block font-bold">Business profile</span>
        <span className="mt-1 block text-sm text-slate-600">Your verified business details. Changes are approved by GBBookings before they apply.</span>
      </button>
      <button type="button" onClick={() => onTab('security')} className="rounded-2xl border border-slate-200 bg-white p-6 text-left hover:border-[#006F3C]">
        <ShieldCheck className="size-5 text-[#006F3C]" aria-hidden="true" />
        <span className="mt-2 block font-bold">Account settings</span>
        <span className="mt-1 block text-sm text-slate-600">Manage email verification, your password and active sessions.</span>
      </button>
    </div>
  </div>;
}
