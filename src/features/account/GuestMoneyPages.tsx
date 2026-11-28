import { useEffect, useState } from 'react';
import { Gift, LoaderCircle } from 'lucide-react';
import { api, type GuestPreferences } from '../../shared/api/api';
import { Loading, button, card, field, pkr, primary, RequestStatus, Table, useLoad } from '../admin/ConsolePages';
import { toast } from '../../shared/components/Toaster';

const date = (value?: string) => value ? new Date(value).toLocaleDateString('en-PK', { dateStyle: 'medium' }) : '—';

/** Every payment, refund and partner payment request on the guest's bookings. Paying a booking happens on its card under My bookings. */
export function GuestPayments() {
  const { value, error } = useLoad(() => api.guestConsole.payments());
  return <div className="mx-auto max-w-5xl space-y-6 pb-10">
    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Payments &amp; refunds</h1>
    <Loading error={error} ready={Boolean(value)}>{value && <>
      <section className="space-y-2"><h2 className="text-lg font-bold">Payments</h2>
        <Table head={['Booking', 'Stay', 'Total', 'How', 'Status']} empty="No bookings yet."
          rows={value.payments.map((row) => [<><p className="font-semibold">{row.listingTitle}</p><p className="font-mono text-xs text-slate-500">{row.reference}</p></>, date(row.checkIn), pkr(row.total),
            row.method, <>{row.status === 'paid' ? `Paid ${date(row.paidAt)}` : row.status === 'refunded' ? 'Refunded' : row.bookingStatus === 'cancelled' ? 'Not charged' : 'To pay'}{row.balanceDue > 0 && <p className="text-xs text-amber-700">{pkr(row.balanceDue)} to pay on arrival</p>}</>])} />
        <p className="text-xs text-slate-500">To pay a Pay now booking, use Complete payment on it under My bookings.</p>
      </section>
      <section className="space-y-2"><h2 className="text-lg font-bold">Refunds</h2>
        <Table head={['Booking', 'Amount', 'How', 'Status']} empty="No refunds."
          rows={value.refunds.map((row) => [<><p className="font-semibold">{row.listingTitle}</p><p className="font-mono text-xs text-slate-500">{row.reference}</p></>, pkr(row.amount), row.channel, row.status === 'sent' ? `Sent ${date(row.sentAt)}` : 'On its way'])} />
        <p className="text-xs text-slate-500">To ask for a refund, cancel the booking under My bookings; the refund follows its cancellation policy. For anything else, use Get help on the booking.</p>
      </section>
      <section className="space-y-2"><h2 className="text-lg font-bold">Payment requests from partners</h2>
        <Table head={['Booking', 'From', 'For', 'Amount', 'Due', 'Status']} empty="No payment requests."
          rows={value.requests.map((row) => [<span className="font-mono text-xs">{row.bookingReference}</span>, row.partnerName, <>{row.typeLabel}{row.note && <p className="text-xs text-slate-500">{row.note}</p>}</>, pkr(row.amount), row.dueDate, <RequestStatus status={row.status} />])} />
        <p className="text-xs text-slate-500">You pay these to the partner directly. If one looks wrong, use Get help on the booking.</p>
      </section>
    </>}</Loading>
  </div>;
}

export function GuestLoyalty() {
  const { value, error } = useLoad(() => api.guestConsole.loyalty());
  return <div className="mx-auto max-w-3xl space-y-6 pb-10">
    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Loyalty</h1>
    <Loading error={error} ready={Boolean(value)}>{value ? <>
      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-slate-200 bg-white p-6">
        <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-100"><Gift className="size-8 text-amber-700" aria-hidden="true" /></span>
        <div><p className="text-sm text-slate-500">{value.tier} member</p><p className="text-3xl font-extrabold">{value.points.toLocaleString()} points</p>
          <p className="text-sm text-slate-600">{value.trips} completed trip{value.trips === 1 ? '' : 's'} · {pkr(value.lifetimeValue)} spent</p></div>
      </section>
      {value.nextTier && <p className="text-sm text-slate-700">Spend {pkr(value.toNextTier ?? 0)} more on completed trips to reach {value.nextTier}.</p>}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
        <p className="font-semibold">Your referral code: <span className="font-mono text-base">{value.referralCode}</span></p>
        <p className="mt-2">You earn one point for every PKR 100 spent on completed trips. Bronze to start, Silver from PKR 150,000, Gold from PKR 500,000. Points and referral rewards cannot be spent yet; we will tell you when they can.</p>
      </section>
    </> : <LoaderCircle className="size-6 animate-spin" />}</Loading>
  </div>;
}

/** What the guest still owes, in one place. Paying happens on the booking itself, under My bookings. */
export function GuestPaymentPortal({ onNavigate }: { onNavigate: (view: string) => void }) {
  const { value, error } = useLoad(() => api.guestConsole.payments());
  const outstanding = (value?.payments ?? []).filter((row) => row.balanceDue > 0 && row.bookingStatus !== 'cancelled');
  const totalDue = outstanding.reduce((sum, row) => sum + row.balanceDue, 0);
  return <div className="mx-auto max-w-5xl space-y-6 pb-10">
    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Payment portal</h1>
    <Loading error={error} ready={Boolean(value)}>{value && <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">Still to pay</p>
        <p className="mt-1 text-3xl font-extrabold">{pkr(totalDue)}</p>
        <p className="mt-1 text-sm text-slate-600">{outstanding.length === 0 ? 'Nothing outstanding. Balances appear here when a booking is confirmed with an amount due on arrival.' : `${outstanding.length} booking${outstanding.length === 1 ? '' : 's'} with an amount due.`}</p>
      </section>
      <section className="space-y-2"><h2 className="text-lg font-bold">Outstanding balances</h2>
        <Table head={['Booking', 'Stay', 'Total', 'Still to pay', '']} empty="No outstanding balances."
          rows={outstanding.map((row) => [<><p className="font-semibold">{row.listingTitle}</p><p className="font-mono text-xs text-slate-500">{row.reference}</p></>, date(row.checkIn), pkr(row.total), <strong>{pkr(row.balanceDue)}</strong>,
            <button type="button" className={button} onClick={() => onNavigate('bookings')}>View booking</button>])} />
        <p className="text-xs text-slate-500">Pay now bookings are completed on the booking under My bookings. Amounts due on arrival are paid to the partner directly.</p>
      </section>
      <section className="space-y-2"><h2 className="text-lg font-bold">All payments</h2>
        <Table head={['Booking', 'Stay', 'Total', 'How', 'Status']} empty="No bookings yet."
          rows={value.payments.map((row) => [<><p className="font-semibold">{row.listingTitle}</p><p className="font-mono text-xs text-slate-500">{row.reference}</p></>, date(row.checkIn), pkr(row.total),
            row.method, <>{row.status === 'paid' ? `Paid ${date(row.paidAt)}` : row.status === 'refunded' ? 'Refunded' : row.bookingStatus === 'cancelled' ? 'Not charged' : 'To pay'}{row.balanceDue > 0 && <p className="text-xs text-amber-700">{pkr(row.balanceDue)} to pay on arrival</p>}</>])} />
      </section>
    </>}</Loading>
  </div>;
}

/** The guest's own display choices: language, currency and email updates. */
export function GuestSettings() {
  const { value, error, reload } = useLoad(() => api.guestConsole.preferences());
  const [draft, setDraft] = useState<GuestPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  useEffect(() => { if (value) setDraft(value); }, [value]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setSaveError('');
    try { await api.guestConsole.savePreferences(draft); toast('Settings saved.'); reload(); }
    catch (reason) { setSaveError(reason instanceof Error ? reason.message : 'Could not save.'); }
    finally { setBusy(false); }
  };
  return <div className="mx-auto max-w-3xl space-y-6 pb-10">
    <h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Settings</h1>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {saveError && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{saveError}</p>}
    {!draft && !error ? <div className="flex justify-center py-10"><LoaderCircle className="size-6 animate-spin text-[#006F3C]" aria-label="Loading" /></div>
      : draft && <form onSubmit={save} className={`${card} space-y-5`}>
        <p className="text-sm text-slate-600">Your display choices. Prices on the site are shown in PKR for now; your currency choice is saved for when more currencies arrive.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-semibold">Language
            <select value={draft.language} onChange={(event) => setDraft({ ...draft, language: event.target.value as GuestPreferences['language'] })} className={`${field} mt-1 w-full`}>
              <option value="en">English</option><option value="ur">Urdu</option>
            </select>
          </label>
          <label className="text-xs font-semibold">Currency
            <select value={draft.currency} onChange={(event) => setDraft({ ...draft, currency: event.target.value as GuestPreferences['currency'] })} className={`${field} mt-1 w-full`}>
              <option value="PKR">PKR · Pakistani Rupee</option><option value="USD">USD · US Dollar</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[#006F3C]" checked={draft.emailNotifications}
          onChange={(event) => setDraft({ ...draft, emailNotifications: event.target.checked })} />
          <span><span className="font-semibold">Email updates</span><span className="block text-xs text-slate-500">Booking confirmations, trip reminders and replies to your messages.</span></span></label>
        <p className="text-xs text-slate-500">Password, email and two-step sign-in are under Account settings.</p>
        <div><button className={primary} disabled={busy}>{busy ? 'Saving…' : 'Save settings'}</button></div>
      </form>}
  </div>;
}
