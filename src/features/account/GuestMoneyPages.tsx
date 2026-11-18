import { Gift, LoaderCircle } from 'lucide-react';
import { api } from '../../shared/api/api';
import { Loading, pkr, RequestStatus, Table, useLoad } from '../admin/ConsolePages';

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
