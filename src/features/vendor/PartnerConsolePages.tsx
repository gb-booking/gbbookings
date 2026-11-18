import { useState } from 'react';
import { FileText } from 'lucide-react';
import { api, type PaymentRequest } from '../../shared/api/api';
import DateInput from '../../shared/components/DateInput';
import Select from '../../shared/components/Select';
import { toast } from '../../shared/components/Toaster';
import { button, field, Loading, pkr, primary, RequestStatus, Table, useLoad } from '../admin/ConsolePages';

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
