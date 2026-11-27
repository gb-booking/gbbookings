import { toast } from '../../shared/components/Toaster';
import { CANCELLATION_POLICIES, daysBetween, refundPercentFor } from '../../shared/utils/cancellation';
import ChangeBookingDialog from './ChangeBookingDialog';
import EditBookingDialog from './EditBookingDialog';
import BookingSupportDialog from './BookingSupportDialog';
import ChangeEmailDialog from './ChangeEmailDialog';
import { openPaymentTab, PaymentWaiting, sendToPayment } from '../booking/paymentTab';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Award, Bell, Building2, Calendar, CalendarDays, Check, ChevronLeft, ChevronRight, Circle, Heart, LoaderCircle, MapPin, MessageSquare, RefreshCw, Star, Trash2, Wallet, X } from 'lucide-react';
import type { Booking, Listing } from '../../types';
import { handleImageError } from '../../types';
import { api, ApiError, type AuthUser, type Paginated, type VendorProfile } from '../../shared/api/api';
import { formatDateForDisplay, nextDay } from '../../shared/utils/date';
import { useBodyScrollLock } from '../../shared/utils/scrollLock';
import SecurityPanel from './SecurityPanel';
import { ReviewDialog } from '../reviews/ReviewParts';
import { useReasonDialog } from '../../shared/components/ReasonDialog';

interface UserDashboardProps {
  userEmail: string; userName?: string; setView: (view: string) => void;
  onSelectBooking: (booking: Booking) => void; onSelectListing: (listing: Listing) => void;
  /** Opens the inbox thread with this booking's partner. */
  onMessage: (booking: Booking) => void;
  /** Bookings: the guest's trips. Saved: the wishlist. Profile: identity, details and security (plus the business card for partners). */
  section: 'bookings' | 'profile' | 'saved';
  /** Set when the guest comes back from Safepay's payment page. */
  paymentReturn?: { bookingId: string; cancelled: boolean };
}
type Trip = 'upcoming' | 'past' | 'cancelled';
const TRIP_TABS: Array<[Trip, string]> = [['upcoming', 'Upcoming'], ['past', 'Past'], ['cancelled', 'Cancelled']];
const statusLabels: Record<Booking['status'], string> = {
  pending: 'Awaiting confirmation', confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show',
};
const statusColors: Record<Booking['status'], string> = {
  pending: 'bg-amber-50 text-amber-800', confirmed: 'bg-emerald-50 text-emerald-800',
  completed: 'bg-slate-100 text-slate-600', cancelled: 'bg-rose-50 text-rose-700', no_show: 'bg-slate-100 text-slate-600',
};
const primaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 text-sm font-bold text-white shadow-xs transition-colors hover:bg-slate-800 disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-xs transition-colors hover:bg-slate-50 disabled:opacity-50';
const money = (amount: number) => 'PKR ' + amount.toLocaleString('en-PK', { maximumFractionDigits: 2 });
const clock = (value?: string | Date) => value ? new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : 'soon';
const awaitingPayment = (booking: Booking) => booking.status === 'pending' && booking.paymentMethod === 'online' && booking.paymentStatus === 'pending';
const BUSINESS_LABEL: Record<string, string> = { hotel: 'Hotel business', homestay: 'Homestay host', vehicle: 'Car rental partner', tour_operator: 'Tour partner', multi_service: 'Partner business' };

export default function UserDashboard(props: UserDashboardProps) {
  return <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8 animate-fadeIn pb-8">
    <DashboardShell {...props}>
      {props.section === 'bookings' ? <BookingsPage {...props} /> : props.section === 'saved' ? <SavedPage {...props} /> : <ProfilePage {...props} />}
    </DashboardShell>
  </div>;
}

/**
 * Restored header/stats/tabs from src/components/UserDashboard.tsx at
 * 5372888^ (initials + name + loyalty badge, Active Bookings / Wallet /
 * Loyalty Coins stats, My Bookings / Saved Wishlist / My Wallet /
 * Rewards & Referrals / Alerts tabs), wired to the CURRENT api only.
 *
 * Deleted, never restored: the old file's hardcoded wallet (Rs.14,500,
 * tx-1 50,000 deposit, tx-2 105,000 payment, tx-3 5,000 referral bonus),
 * the hardcoded referral metrics (12 friends, 1 approved, PKR 5,000,
 * invite/AR105) and the "Gold Loyalty" badge. There is no guest wallet-balance
 * endpoint in the current api, so the stats show real loyalty points instead
 * of a balance, and My Wallet opens /payments (GuestPayments: real payments
 * and refunds) while Rewards & Referrals opens /loyalty (GuestLoyalty: real
 * points, tier and referral code). There is also no guest notifications
 * endpoint (the old /api/notifications is gone), so Alerts opens an inline
 * panel that says so instead of a fake list.
 */
function DashboardShell({ children, userEmail, userName, setView, section }: UserDashboardProps & { children: ReactNode }) {
  const [loyalty, setLoyalty] = useState<{ points: number; tier: string; trips: number } | null>(null);
  const [emailVerified, setEmailVerified] = useState(false);
  const [activeBookings, setActiveBookings] = useState<number | null>(null);
  const [trips, setTrips] = useState<number | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    api.guestConsole.loyalty().then((result) => { if (active) setLoyalty(result); }).catch(() => undefined);
    api.getCurrentUser().then(({ user }) => { if (active) setEmailVerified(user.emailVerified === true); }).catch(() => undefined);
    Promise.all([api.getBookingsPage(1, 'upcoming'), api.getBookingsPage(1, 'past')]).then(([upcoming, past]) => {
      if (!active) return;
      setActiveBookings(upcoming.data.filter((booking) => booking.status === 'confirmed').length);
      setTrips(past.pagination.total);
    }).catch(() => undefined);
    api.getWishlist().then((items) => { if (active) setSavedCount(items.length); }).catch(() => undefined);
    return () => { active = false; };
  }, [userEmail]);

  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'Traveler');
  const userInitials = displayName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'GB';
  const activeTab = section === 'bookings' ? 'trips' : section === 'saved' ? 'wishlist' : alertsOpen ? 'notifications' : null;
  const tabs = [
    { id: 'trips', label: 'My Bookings', icon: Calendar, onClick: () => { setAlertsOpen(false); setView('bookings'); } },
    { id: 'wishlist', label: 'Saved Wishlist', icon: Heart, count: savedCount, onClick: () => { setAlertsOpen(false); setView('saved'); } },
    { id: 'wallet', label: 'My Wallet', icon: Wallet, onClick: () => { setAlertsOpen(false); setView('payments'); } },
    { id: 'rewards', label: 'Rewards & Referrals', icon: Award, onClick: () => { setAlertsOpen(false); setView('loyalty'); } },
    { id: 'notifications', label: 'Alerts', icon: Bell, onClick: () => setAlertsOpen(true) },
  ] as const;

  return <>
    {/* Header Profile Summary */}
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 sm:gap-6 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs" id="user-profile-header">
      <div className="flex items-center space-x-3.5 sm:space-x-4">
        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg bg-[#0F172A] flex items-center justify-center font-bold text-white text-xl sm:text-2xl shadow-xs shrink-0">
          {userInitials}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900 flex flex-wrap items-center gap-2 uppercase tracking-tight">
            <span>{displayName}</span>
            {loyalty && <span className="bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">{loyalty.tier} Loyalty</span>}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{userEmail}{emailVerified ? ' • Verified Traveler' : ''}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 min-[480px]:grid-cols-3 gap-2.5 sm:gap-4" id="dashboard-metrics-summary">
        <div className="bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-lg text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Active Bookings</span>
          <span className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5 sm:mt-1 block font-mono">{activeBookings === null ? '—' : `${activeBookings} Active`}</span>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-lg text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Loyalty Points</span>
          <span className="text-xs sm:text-sm font-bold text-indigo-600 mt-0.5 sm:mt-1 block font-mono">{loyalty === null ? '—' : `${loyalty.points.toLocaleString()} pts`}</span>
        </div>
        <div className="col-span-2 min-[480px]:col-span-1 bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-lg text-center shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Trips</span>
          <span className="text-xs sm:text-sm font-bold text-amber-600 mt-0.5 sm:mt-1 block font-mono">{trips === null ? '—' : `${trips} trip${trips === 1 ? '' : 's'}`}</span>
        </div>
      </div>
    </div>

    {/* Tabs Controller */}
    <div className="flex border-b border-slate-200 pb-1.5 space-x-3 sm:space-x-6 overflow-x-auto touch-scroll-x scrollbar-none" id="dashboard-tabs-bar">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={`tab-dash-${tab.id}`}
            onClick={tab.onClick}
            className={`min-h-[44px] px-2 sm:px-3 pb-3 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center space-x-2 relative whitespace-nowrap shrink-0 ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
            {'count' in tab && tab.count > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono">{tab.count}</span>
            )}
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />
            )}
          </button>
        );
      })}
    </div>

    {alertsOpen ? <AlertsPanel onBack={() => setAlertsOpen(false)} onInbox={() => setView('inbox')} /> : children}
  </>;
}

/** No guest notifications endpoint exists in the current api (the old
    /api/notifications is gone), so Alerts states that plainly instead of
    showing a fake list. Booking updates arrive by email; partner messages
    land in the inbox. */
function AlertsPanel({ onBack, onInbox }: { onBack: () => void; onInbox: () => void }) {
  return <div className="bg-white rounded-2xl p-8 sm:p-12 text-center border border-slate-200 shadow-xs" id="dash-notifications-pane">
    <Bell className="w-10 h-10 text-slate-400 mx-auto mb-3" />
    <h3 className="text-base font-bold text-slate-900">No alerts here yet</h3>
    <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mt-2">
      There is no alerts feed for guests in the current API, so nothing is listed here. Booking updates arrive by email, and messages from partners land in your inbox.
    </p>
    <div className="flex flex-wrap justify-center gap-2 mt-6">
      <button type="button" onClick={onInbox} className={primaryButton}>Open inbox</button>
      <button type="button" onClick={onBack} className={secondaryButton}>Back to My Bookings</button>
    </div>
  </div>;
}

/* ───────────────────────── Bookings & trips ───────────────────────── */

function BookingsPage({ setView, onSelectBooking, onMessage, paymentReturn, userEmail }: UserDashboardProps) {
  const [trip, setTrip] = useState<Trip>('upcoming');
  const [page, setPage] = useState(1);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<Paginated<Booking>['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const [cancelBooking, setCancelBooking] = useState<Booking | null>(null);
  const [changeBooking, setChangeBooking] = useState<Booking | null>(null);
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [helpBooking, setHelpBooking] = useState<Booking | null>(null);
  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [paying, setPaying] = useState<{ bookingId: string; url: string } | null>(null);
  const { askReason, dialog: reasonDialog } = useReasonDialog();
  const disputeNoShow = async (booking: Booking) => {
    const note = await askReason({ title: 'Were you there?', description: 'Tell us what happened, for example when you arrived and who you spoke to. The partner sees your note, and GBBookings decides. The partner is not paid for this booking until then.', confirmLabel: 'Send dispute', noteLabel: 'What happened' });
    if (!note) return;
    try { await api.disputeNoShow(booking.id, note); toast('Dispute sent. We will email you with the decision.'); setReload((value) => value + 1); }
    catch (reason) { toast(reason instanceof Error ? reason.message : 'Your dispute could not be sent. Please try again.', 'error'); }
  };
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const cancelLock = useRef(false);
  const [paymentNotice, setPaymentNotice] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    api.getBookingsPage(page, trip).then((result) => {
      if (!active) return;
      if (page > Math.max(1, result.pagination.pages)) { setPage(Math.max(1, result.pagination.pages)); return; }
      setBookings(result.data); setPagination(result.pagination);
      // Unpaid Pay now bookings may have been paid without the guest coming back: re-check them with the server.
      for (const booking of result.data.filter(awaitingPayment)) {
        api.verifyPayment(booking.id).then((checked) => {
          if (active && checked.paymentStatus === 'paid') setBookings((items) => items.map((item) => item.id === checked.id ? checked : item));
        }).catch(() => undefined);
      }
    }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'We couldn’t load your bookings. Please try again.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, trip, reload, userEmail]);

  // Back from Safepay: the server asks Safepay whether the payment went through.
  useEffect(() => {
    if (!paymentReturn) return;
    api.verifyPayment(paymentReturn.bookingId).then((booking) => {
      setPaymentNotice(booking.paymentStatus === 'paid'
        ? { tone: 'ok', text: `Payment received. ${booking.reference} is confirmed and we have emailed you the details.` }
        : { tone: 'warn', text: `${paymentReturn.cancelled ? 'Payment was cancelled' : 'Payment did not go through'}. ${booking.status === 'pending' ? `${booking.reference} is held until ${clock(booking.respondBy)}: use Complete payment to try again.` : 'The booking was released.'}` });
      setReload((value) => value + 1);
    }).catch((reason) => setPaymentNotice({ tone: 'warn', text: reason instanceof Error ? reason.message : 'We could not check the payment. Refresh in a moment.' }));
  }, [paymentReturn]);

  const completePayment = async (booking: Booking) => {
    setPayingId(booking.id); setPaymentNotice(null);
    const tab = openPaymentTab();
    try {
      const url = await api.startPayment(booking.id);
      sendToPayment(tab, url);
      if (tab) { setPaying({ bookingId: booking.id, url }); setPayingId(null); }
    }
    catch (reason) { tab?.close(); setPaymentNotice({ tone: 'warn', text: reason instanceof Error ? reason.message : 'The payment page did not open. Please try again.' }); setPayingId(null); }
  };
  const confirmCancellation = async (reason: string) => {
    if (!cancelBooking || cancelLock.current) return;
    cancelLock.current = true; setCancelBusy(true); setCancelError('');
    try { await api.cancelBooking(cancelBooking.id, reason.trim() || 'Cancelled by guest'); setCancelBooking(null); setReload((value) => value + 1); }
    catch (reason) { setCancelError(reason instanceof Error ? reason.message : 'We couldn’t cancel this booking. Please try again.'); }
    finally { cancelLock.current = false; setCancelBusy(false); }
  };
  const pickTrip = (next: Trip) => { setTrip(next); setPage(1); };

  if (paying) return <PaymentWaiting bookingId={paying.bookingId} url={paying.url} />;
  return <div id="user-dashboard-view" className="mx-auto max-w-7xl space-y-6 pb-10">
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
      <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-950">Bookings &amp; trips</h1>
      <div className="flex items-center gap-2">
        <button type="button" disabled={loading} onClick={() => setReload((value) => value + 1)} aria-label="Refresh bookings" className="flex size-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40"><RefreshCw className="size-4" /></button>
        <button type="button" onClick={() => setView('hotels')} className={secondaryButton}>Find your next stay<ArrowRight className="size-4" /></button>
      </div>
    </div>
    {paymentNotice && <p role="status" className={`rounded-xl p-4 text-sm ${paymentNotice.tone === 'ok' ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}>{paymentNotice.text}</p>}

    <div role="tablist" aria-label="Booking lists" className="flex gap-1 border-b border-slate-200">
      {TRIP_TABS.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={trip === id} onClick={() => pickTrip(id)}
        className={`-mb-px min-h-11 border-b-[3px] px-4 text-[15px] font-bold transition ${trip === id ? 'border-[#006F3C] text-[#006F3C]' : 'border-transparent text-slate-500 hover:text-slate-900'}`}>
        {label}{trip === id && pagination && !loading ? ` (${pagination.total})` : ''}</button>)}
    </div>

    <section role="tabpanel" aria-label={`${trip} bookings`} className="space-y-4">
      {error ? <ErrorNotice message={error} onRetry={() => setReload((value) => value + 1)} />
        : loading ? <LoadingCards />
        : bookings.length === 0 ? <EmptyState icon={<CalendarDays className="size-6" />}
            title={trip === 'upcoming' ? 'Your next trip starts here' : trip === 'past' ? 'No past trips yet' : 'No cancelled bookings'}
            text={trip === 'upcoming' ? 'Book a stay, car or tour and it will appear here.' : 'They will appear here when you have some.'}
            action={<button type="button" onClick={() => setView('hotels')} className={primaryButton}>Explore stays<ArrowRight className="size-4" /></button>} />
        : bookings.map((booking) => trip === 'upcoming'
          ? <UpcomingCard key={booking.id} booking={booking} today={today} paying={payingId === booking.id}
              canCancel={today < booking.startDate} onView={() => onSelectBooking(booking)} onMessage={() => onMessage(booking)} onPay={() => void completePayment(booking)}
              onCancel={() => { setCancelError(''); setCancelBooking(booking); }} onChange={() => setChangeBooking(booking)} onEdit={() => setEditBooking(booking)} onHelp={() => setHelpBooking(booking)}
              onAnswer={async (decision) => {
                try { await api.answerChangeProposal(booking.id, decision); toast(decision === 'accept' ? 'Change accepted. Your booking has been updated.' : 'Change declined. Your booking stays as it was.'); setReload((value) => value + 1); }
                catch (reason) { toast(reason instanceof Error ? reason.message : 'That could not be saved. Please try again.', 'error'); }
              }} />
          : <CompactCard key={booking.id} booking={booking} onView={() => onSelectBooking(booking)} onReview={() => setReviewBooking(booking)} onDispute={() => void disputeNoShow(booking)} onHelp={() => setHelpBooking(booking)} />)}
      {!loading && !error && pagination && pagination.pages > 1 && <nav aria-label="Booking pages" className="flex flex-wrap items-center justify-between gap-3 pt-2"><p className="text-xs text-slate-500">Page {page} of {pagination.pages}</p><div className="flex gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className={secondaryButton}><ChevronLeft className="size-4" />Previous</button><button type="button" disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)} className={secondaryButton}>Next<ChevronRight className="size-4" /></button></div></nav>}
    </section>
    {reasonDialog}
    {reviewBooking && <ReviewDialog booking={reviewBooking} onClose={() => setReviewBooking(null)} onSaved={(review) => { setBookings((items) => items.map((item) => item.id === reviewBooking.id ? { ...item, review, reviewableUntil: undefined } : item)); setReviewBooking(null); }} />}
    {helpBooking && <BookingSupportDialog booking={helpBooking} onClose={() => setHelpBooking(null)} />}
    {editBooking && <EditBookingDialog booking={editBooking} onClose={() => setEditBooking(null)} onSaved={(updated) => { setBookings((items) => items.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); setEditBooking(null); toast('Your details were updated.'); }} />}
    {changeBooking && <ChangeBookingDialog booking={changeBooking} onClose={() => setChangeBooking(null)} onSent={(updated) => { setBookings((items) => items.map((item) => item.id === updated.id ? updated : item)); setChangeBooking(null); }} />}
    {cancelBooking && <CancelReservationDialog booking={cancelBooking} busy={cancelBusy} error={cancelError} onClose={() => setCancelBooking(null)} onConfirm={confirmCancellation} />}
  </div>;
}

/** Saves the trip as a calendar file, made in the browser. Car and tour end dates are days of the trip; a stay's is the morning it ends. */
function downloadCalendar(booking: Booking) {
  const compact = (date: string) => date.replaceAll('-', '');
  const text = (value: string) => value.replace(/[\\;,]/g, '\\$&').replace(/\r?\n/g, '\\n');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GBBookings//Booking//EN', 'BEGIN:VEVENT',
    `UID:${booking.id}@gbbookings`, `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART;VALUE=DATE:${compact(booking.startDate)}`, `DTEND;VALUE=DATE:${compact(booking.rental || booking.tour ? nextDay(booking.endDate) : booking.endDate)}`,
    `SUMMARY:${text(booking.listingTitle)}`, `LOCATION:${text(booking.listingLocation)}`, `DESCRIPTION:${text(`GBBookings booking ${booking.reference}`)}`,
    'END:VEVENT', 'END:VCALENDAR', '',
  ];
  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar' }));
  Object.assign(document.createElement('a'), { href: url, download: `${booking.reference || 'booking'}.ics` }).click();
  URL.revokeObjectURL(url);
}

const daysUntil = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
const partySummary = (booking: Booking) => booking.tour
  ? `${booking.guests || 1} traveller(s) · ${booking.tour.days} day(s)`
  : `${booking.duration ?? 1} ${booking.rental ? 'day' : 'night'}(s) · ${booking.rooms || 1} ${booking.rental ? 'car' : 'room'}(s) · ${booking.guests || booking.adults || 1} ${booking.rental ? 'passenger' : 'guest'}(s)`;

function UpcomingCard({ booking, today, canCancel, paying, onView, onMessage, onPay, onCancel, onChange, onEdit, onHelp, onAnswer }: {
  onAnswer: (decision: 'accept' | 'decline') => Promise<void>;
  booking: Booking; today: string; canCancel: boolean; paying: boolean; onView: () => void; onMessage: () => void; onPay: () => void; onCancel: () => void; onChange: () => void; onEdit: () => void; onHelp: () => void;
}) {
  const unpaid = awaitingPayment(booking);
  const days = daysUntil(today, booking.startDate);
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : `in ${days} days`;
  const startLabel = booking.tour ? 'Meet' : booking.rental ? 'Pickup' : 'Check-in';
  const startValue = booking.tour ? `${booking.tour.meetingPoint ?? ''}${booking.tour.startTime ? ` · ${booking.tour.startTime}` : ''}`
    : booking.rental ? `${booking.rental.pickupTime}, ${booking.rental.pickupPlace}` : booking.checkInTime ? `From ${booking.checkInTime}` : formatDateForDisplay(booking.startDate);
  return <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex-row">
    <img src={booking.listingImage} alt="" onError={handleImageError} className="h-48 w-full object-cover sm:h-auto sm:w-44" />
    <div className="min-w-0 flex-1 space-y-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap gap-2">
          <span className={'rounded-full px-3 py-1 text-xs font-bold ' + (unpaid ? 'bg-amber-50 text-amber-800' : statusColors[booking.status])}>{unpaid ? 'Awaiting payment' : statusLabels[booking.status]}</span>
          {booking.paymentStatus === 'paid' && <span className="rounded-full bg-[#00391F] px-3 py-1 text-xs font-bold text-white">Paid</span>}
        </span>
        <span className="break-all font-mono text-xs text-slate-500">{booking.reference || booking.id}</span>
      </div>
      <div>
        <h2 className="text-lg font-bold uppercase tracking-tight text-[#0F172A]">{booking.listingTitle}</h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500"><MapPin className="size-3.5 shrink-0" />{booking.listingLocation}</p>
      </div>
      <p className="text-sm text-slate-600">{formatDateForDisplay(booking.startDate)} – {formatDateForDisplay(booking.endDate)} · {partySummary(booking)} · <strong className="text-slate-900">{when}</strong></p>
      <dl className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm sm:grid-cols-3">
        <div><dt className="text-slate-500">{startLabel}</dt><dd className="font-semibold text-slate-900">{startValue}</dd></div>
        <div><dt className="text-slate-500">Questions?</dt><dd><button type="button" onClick={onMessage} className="font-semibold text-[#006F3C] underline">Message the partner</button></dd></div>
        <div><dt className="text-slate-500">{booking.paymentStatus === 'paid' ? 'Total paid' : unpaid ? 'To pay now' : 'Pay on arrival'}</dt><dd className="font-semibold text-slate-900">{money(booking.totalPrice)}</dd></div>
      </dl>
      {unpaid && <p className="text-sm font-semibold text-amber-800">Not paid yet · held until {clock(booking.respondBy)}</p>}
      {booking.lastChange && !booking.changeRequest && <p role="status" className="rounded-lg bg-sky-50 p-3 text-sm text-sky-950">
        <strong className="font-semibold">{booking.lastChange.askedByGuest ? 'The partner accepted your change' : 'You accepted the partner’s change'}</strong> on {formatDateForDisplay(booking.lastChange.at)}.
        {booking.lastChange.reason && <> Reason: “{booking.lastChange.reason}”.</>} It was {formatDateForDisplay(booking.lastChange.from.checkIn)} to {formatDateForDisplay(booking.lastChange.from.checkOut)}{booking.lastChange.from.roomName ? `, ${booking.lastChange.from.rooms} × ${booking.lastChange.from.roomName}` : ''}, {money(booking.lastChange.from.total)}.
      </p>}
      {booking.changeRequest?.status === 'pending' && booking.changeRequest.proposedBy === 'partner' && <div role="status" className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-semibold">The partner would like to change this booking</p>
        <p>New: {formatDateForDisplay(booking.changeRequest.checkIn)} to {formatDateForDisplay(booking.changeRequest.checkOut)}, {booking.changeRequest.rooms} × {booking.changeRequest.roomName}{booking.changeRequest.newTotalMinor !== undefined ? `, ${money(booking.changeRequest.newTotalMinor / 100)} in total (now ${money(booking.totalPrice)})` : ''}.</p>
        {booking.changeRequest.reason && <p>Their reason: “{booking.changeRequest.reason}”</p>}
        <p className="text-xs">Nothing changes unless you accept. If you decline, your booking stays as it is.{booking.paymentStatus === 'paid' ? ' You already paid: a lower total is refunded, and a higher one is paid on arrival.' : ''}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" onClick={() => void onAnswer('accept')} className={primaryButton}>Accept change</button>
          <button type="button" onClick={() => void onAnswer('decline')} className={secondaryButton}>Keep my booking</button>
        </div>
      </div>}
      {booking.changeRequest?.status === 'pending' && !booking.changeRequest.proposedBy && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">You asked to change this to {formatDateForDisplay(booking.changeRequest.checkIn)} – {formatDateForDisplay(booking.changeRequest.checkOut)}. Waiting for the partner.</p>}
      {booking.changeRequest?.status === 'declined' && <p role="status" className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">The partner declined your change request{booking.changeRequest.declineReason ? `: ${booking.changeRequest.declineReason}` : ''}. Your booking stays as it was.</p>}
      {booking.balanceDue && !booking.balanceCollectedAt ? <p className="text-sm font-semibold text-slate-800">{money(booking.balanceDue)} still to pay on arrival</p> : null}
      {booking.refunds?.map((refund, index) => <p key={index} className="text-sm font-semibold text-[#00552E]">{money(refund.amount)} refund {refund.status === 'sent' ? 'sent' : 'on its way'}</p>)}
      <div className="flex flex-wrap gap-2 pt-1">
        {unpaid && <button type="button" disabled={paying} onClick={onPay} className={primaryButton}>{paying && <LoaderCircle className="size-4 animate-spin" />}Complete payment</button>}
        <button type="button" onClick={onView} className={unpaid ? secondaryButton : primaryButton}>View voucher</button>
        <button type="button" onClick={onMessage} className={secondaryButton}><MessageSquare className="size-4" aria-hidden="true" />Message partner</button>
        {today <= booking.startDate && !booking.checkedInAt && <button type="button" onClick={onEdit} className={secondaryButton}>Edit details</button>}
        {canCancel && !unpaid && <button type="button" onClick={onChange} className={secondaryButton}>Request a change</button>}
        {booking.status === 'confirmed' && <button type="button" onClick={() => downloadCalendar(booking)} className={secondaryButton}><CalendarDays className="size-4" aria-hidden="true" />Add to calendar</button>}
        <button type="button" onClick={onHelp} className={secondaryButton}>Get help</button>
        {canCancel && <button type="button" onClick={onCancel} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50">Cancel booking</button>}
      </div>
    </div>
  </article>;
}

function CompactCard({ booking, onView, onReview, onDispute, onHelp }: { booking: Booking; onView: () => void; onReview: () => void; onDispute: () => void; onHelp: () => void }) {
  const canDispute = booking.status === 'no_show' && booking.noShow && !booking.noShow.dispute && Date.now() < Date.parse(booking.noShow.disputeUntil);
  const dispute = booking.noShow?.dispute;
  const note = dispute
    ? <span className="font-semibold text-amber-900">{dispute.status === 'open' ? 'You disputed this no-show. GBBookings is looking into it.' : `Dispute decided: ${dispute.decisionNote}`}</span>
    : canDispute ? <span className="font-semibold text-amber-900">Marked as a no-show by the partner. You can dispute this until {formatDateForDisplay(booking.noShow!.disputeUntil)}.</span>
    : booking.status === 'cancelled'
    ? (booking.refund ? <span className="font-semibold text-[#00552E]">Refund {money(booking.refund.amount)} ({booking.refund.percent}%) · {booking.refund.amount === 0 ? 'none due' : booking.refunds?.every((refund) => refund.status === 'sent') ? 'sent' : 'on its way'}</span> : <span>Nothing was charged</span>)
    : booking.review ? <span className="flex items-center gap-1"><Star className="size-3.5 fill-amber-400 text-amber-400" />You rated it {booking.review.overall}/5</span>
    : booking.reviewableUntil ? <span>Review open until {formatDateForDisplay(booking.reviewableUntil)}</span>
    : <span>{statusLabels[booking.status]}</span>;
  return <article className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:px-5">
    <div className="flex min-w-0 items-center gap-4">
      <img src={booking.listingImage} alt="" onError={handleImageError} className="size-[72px] shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-base font-bold text-slate-950">{booking.listingTitle}</h2>
        <p className="text-sm text-slate-500">{formatDateForDisplay(booking.startDate)} – {formatDateForDisplay(booking.endDate)} · {money(booking.totalPrice)}</p>
        <p className="text-[13px] text-slate-600">{note}</p>
      </div>
    </div>
    <div className="flex flex-wrap gap-2">
      {canDispute && <button type="button" onClick={onDispute} className={primaryButton}>I was there</button>}
      {booking.reviewableUntil && <button type="button" onClick={onReview} className={primaryButton}><Star className="size-4" />Write a review</button>}
      <button type="button" onClick={onHelp} className={secondaryButton}>Get help</button>
      <a href={`/listing/${encodeURIComponent(booking.listingId)}`} className={secondaryButton}>Book again</a>
      <button type="button" onClick={onView} className={secondaryButton}>View<ChevronRight className="size-4" /></button>
    </div>
  </article>;
}

/* ───────────────────────── Profile (design B) ───────────────────────── */

function ProfilePage({ userEmail, userName, setView, onSelectListing }: UserDashboardProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [counts, setCounts] = useState<{ trips: number; upcoming: number } | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => {
    let active = true;
    api.getCurrentUser().then(({ user: me }) => {
      if (!active) return;
      setUser(me);
      // Partner-only: the business this account belongs to (owners have one; staff may not see it).
      if (me.roles?.some((role) => role === 'vendor_owner' || role === 'vendor_staff')) {
        api.getMyVendor().then((result) => active && setVendor(result.data))
          .catch((reason) => { if (!(reason instanceof ApiError && reason.status === 404)) console.error(reason); });
      }
    }).catch(() => undefined);
    Promise.all([api.getBookingsPage(1, 'past'), api.getBookingsPage(1, 'upcoming')])
      .then(([past, upcoming]) => active && setCounts({ trips: past.pagination.total, upcoming: upcoming.pagination.total }))
      .catch(() => undefined);
    return () => { active = false; };
  }, [userEmail]);

  useEffect(() => {
    let active = true;
    api.getWishlist().then((items) => { if (active) setSavedCount(items.length); }).catch(() => undefined);
    return () => { active = false; };
  }, [userEmail]);

  const name = user?.name || userName || userEmail.split('@')[0] || 'Traveller';
  const initials = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const isPartner = Boolean(user?.roles?.some((role) => role === 'vendor_owner' || role === 'vendor_staff'));
  const memberSince = user?.memberSince ? new Date(user.memberSince).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : null;
  const card = 'rounded-2xl border border-slate-200 bg-white shadow-xs';

  return <div id="user-dashboard-view" className="mx-auto max-w-7xl space-y-8 pb-10">
    <aside className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className={`${card} flex flex-wrap items-center justify-center sm:justify-start gap-4 p-5 sm:p-6 text-center sm:text-left shadow-xs`}>
        <span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[#0F172A] text-2xl font-extrabold text-white" aria-hidden="true">{initials}</span>
        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-950 wrap-break-word">{name}</h1>
        <p className="text-sm text-slate-500">{isPartner ? 'Partner' : 'Guest'}{memberSince ? ` · member since ${memberSince}` : ''}</p>
        <dl className="mt-1 grid w-full grid-cols-3 gap-3 border-t border-slate-200 pt-4">
          {([['Trips', counts?.trips], ['Upcoming', counts?.upcoming], ['Saved', savedCount ?? undefined]] as const).map(([label, value], index) => (
            <div key={label} className={index === 1 ? 'border-x border-slate-200' : ''}><dd className="text-xl font-extrabold text-slate-950">{value ?? '—'}</dd><dt className="text-xs text-slate-500">{label}</dt></div>
          ))}
        </dl>
      </div>
      <div className={`${card} space-y-3 p-5`}>
        <h2 className="font-extrabold text-slate-950">Verified</h2>
        <Verified ok={Boolean(user?.emailVerified)} label="Email address" />
        <Verified ok={Boolean(user?.twoFactorEnabled)} label="Two-step sign-in" />
        {isPartner && <Verified ok={vendor?.status === 'approved' || (!vendor && isPartner)} label="Partner documents" />}
      </div>
    </aside>

    <main className="min-w-0 space-y-6">
      {isPartner && <section aria-label="Your business" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#0F2A1C] px-6 py-6 text-white">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-emerald-200">Your business</p>
          <h2 className="flex items-center gap-2 text-xl font-extrabold"><Building2 className="size-5 text-emerald-200" aria-hidden="true" />{vendor?.name ?? 'Partner team member'}</h2>
          <p className="text-sm text-slate-300">{[vendor ? BUSINESS_LABEL[vendor.businessType] ?? 'Partner' : null, vendor ? (vendor.status === 'approved' ? 'Approved' : vendor.status) : null, user?.roles?.includes('vendor_owner') ? 'You are the owner' : 'Team member'].filter(Boolean).join(' · ')}</p>
        </div>
        <button type="button" onClick={() => setView('vendor-dashboard')} className="inline-flex min-h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-[#0F2A1C] hover:bg-slate-100">Open partner dashboard</button>
      </section>}

      <section aria-labelledby="profile-details" className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h2 id="profile-details" className="border-b border-slate-200 pb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Personal details</h2>
        {user ? <>
          <EditableRow label="Name" value={user.name} hint="Used on your bookings and reviews." minLength={2}
            onSave={async (value) => setUser(await api.updateProfile({ name: value }))} />
          <EditableRow label="Phone" value={user.phone ?? ''} placeholder="Add a phone number" hint="Filled in at checkout so partners can reach you." minLength={7} allowEmpty
            onSave={async (value) => setUser(await api.updateProfile({ phone: value }))} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-4">
            <div><p className="text-sm font-bold text-slate-900">Email</p><p className="text-[15px] text-slate-600">{user.email}</p></div>
            <div className="flex items-center gap-3">
              {user.emailVerified ? <span className="text-sm font-bold text-[#00552E]">Verified</span> : <span className="text-sm font-semibold text-amber-800">Not verified · see below</span>}
              <button type="button" onClick={() => setChangingEmail(true)} className="min-h-10 text-sm font-semibold text-[#006F3C] underline">Change</button>
            </div>
            {changingEmail && <ChangeEmailDialog currentEmail={user.email} onClose={() => setChangingEmail(false)} />}
          </div>
        </> : <LoadingCards />}
      </section>

      <section aria-labelledby="profile-security" className="space-y-4">
        <h2 id="profile-security" className="border-b border-slate-200 pb-4 text-sm font-bold uppercase tracking-wider text-slate-800">Login &amp; security</h2>
        <div className={`${card} p-5 sm:p-7`}><SecurityPanel /></div>
      </section>

      <section aria-labelledby="profile-saved">
        <button type="button" onClick={() => setView('saved')} className={`${card} flex w-full items-center gap-4 p-5 text-start hover:border-[#006F3C]`}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600"><Heart className="size-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span id="profile-saved" className="block font-semibold text-slate-900">Saved stays</span><span className="block text-sm text-slate-500">{savedCount === null ? 'The places you tapped the heart on.' : `${savedCount} saved ${savedCount === 1 ? 'place' : 'places'}.`}</span></span>
          <ArrowRight className="size-5 shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
        </button>
      </section>
    </main>
  </div>;
}

/** The guest's saved stays, on a page of their own. */
function SavedPage({ setView, onSelectListing }: UserDashboardProps) {
  const [saved, setSaved] = useState<Listing[]>([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [savedError, setSavedError] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setSavedLoading(true); setSavedError('');
    api.getWishlist().then((items) => { if (active) setSaved(items); })
      .catch((reason) => { if (active) setSavedError(reason instanceof Error ? reason.message : 'We couldn’t load your saved stays. Please try again.'); })
      .finally(() => { if (active) setSavedLoading(false); });
    return () => { active = false; };
  }, [reload]);

  const removeSaved = async (id: string) => {
    setRemovingId(id); setSavedError('');
    try { await api.removeWishlistItem(id); setSaved((items) => items.filter((item) => item.id !== id)); toast('Removed from your saved stays.'); }
    catch (reason) { setSavedError(reason instanceof Error ? reason.message : 'Unable to remove this saved stay.'); }
    finally { setRemovingId(null); }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-10">
    <header><h1 className="text-3xl font-extrabold tracking-tight text-slate-950">Saved stays</h1>{!savedLoading && saved.length > 0 && <p className="mt-1 text-sm text-slate-500">{saved.length} saved {saved.length === 1 ? 'place' : 'places'}</p>}</header>
        {savedError && <ErrorNotice message={savedError} onRetry={() => setReload((value) => value + 1)} />}
        {savedLoading ? <LoadingCards /> : !savedError && saved.length === 0 ? <EmptyState icon={<Heart className="size-6" />} title="Keep your favourite places close" text="Tap the heart on a stay, car or tour to save it here while you plan your trip." action={<button type="button" onClick={() => setView('hotels')} className={primaryButton}>Discover stays<ArrowRight className="size-4" /></button>} />
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{saved.map((listing) => <article key={listing.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"><div className="relative"><button type="button" onClick={() => onSelectListing(listing)} aria-label={'View ' + listing.title} className="block w-full"><img src={listing.image} alt={listing.title} onError={handleImageError} className="aspect-[4/3] w-full object-cover" /></button><button type="button" disabled={removingId !== null} onClick={() => void removeSaved(listing.id)} aria-label={'Remove ' + listing.title + ' from saved stays'} className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full bg-white text-rose-700 shadow-sm hover:bg-rose-50 disabled:opacity-50">{removingId === listing.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</button></div><div className="space-y-2 p-4"><p className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3.5" />{listing.location}</p><button type="button" onClick={() => onSelectListing(listing)} className="text-left text-base font-semibold text-slate-900 hover:text-emerald-700">{listing.title}</button><div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{money(listing.price)}<span className="font-normal text-slate-400">{['hotel', 'homestay'].includes(listing.type) ? ' / night' : listing.type === 'car' ? ' / day' : listing.type === 'tour' ? ' / person' : ''}</span></p>{listing.reviewsCount > 0 && <span className="flex items-center gap-1 text-xs text-slate-600"><Star className="size-3 fill-amber-400 text-amber-400" />{listing.rating}</span>}</div></div></article>)}</div>}
  </div>;
}

function Verified({ ok, label }: { ok: boolean; label: string }) {
  return <p className={`flex items-center gap-2.5 text-sm ${ok ? 'text-slate-900' : 'text-slate-500'}`}>
    {ok ? <Check className="size-[18px] text-[#006F3C]" aria-hidden="true" /> : <Circle className="size-[18px] text-slate-400" aria-hidden="true" />}
    {label}<span className="sr-only">{ok ? ': done' : ': not yet'}</span>
  </p>;
}

/** One "Label · value · Edit" row that turns into a small form. */
function EditableRow({ label, value, hint, placeholder, minLength, allowEmpty = false, onSave }: {
  label: string; value: string; hint: string; placeholder?: string; minLength: number; allowEmpty?: boolean; onSave: (value: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(draft.trim()); setEditing(false); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  };
  if (editing) return <form onSubmit={submit} className="space-y-2 border-b border-slate-200 py-4">
    <label className="block text-sm font-bold text-slate-900">{label}
      <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} required={!allowEmpty} minLength={allowEmpty && !draft ? undefined : minLength} maxLength={label === 'Name' ? 120 : 30}
        className="mt-1.5 block min-h-11 w-full max-w-md rounded-lg border border-slate-300 px-3 text-[15px] font-normal outline-none focus:border-[#006F3C]" /></label>
    <p className="text-xs text-slate-500">{hint}</p>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    <div className="flex gap-2"><button disabled={busy} className={primaryButton}>{busy && <LoaderCircle className="size-4 animate-spin" />}Save</button><button type="button" disabled={busy} onClick={() => { setEditing(false); setDraft(value); setError(''); }} className={secondaryButton}>Cancel</button></div>
  </form>;
  return <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 py-4">
    <div><p className="text-sm font-bold text-slate-900">{label}</p><p className="text-[15px] text-slate-600">{value || <span className="text-slate-400">{placeholder}</span>}</p></div>
    <button type="button" onClick={() => { setDraft(value); setEditing(true); }} className="min-h-11 px-3 text-sm font-bold text-[#006F3C] underline">{value ? 'Edit' : 'Add'}</button>
  </div>;
}

/* ───────────────────────── Shared bits ───────────────────────── */

function ErrorNotice({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{message}</p><button type="button" onClick={onRetry} className={secondaryButton}><RefreshCw className="size-4" />Try again</button></div>;
}
function LoadingCards() {
  return <div role="status" aria-label="Loading" className="space-y-4">{[0, 1].map((value) => <div key={value} className="h-40 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />)}<span className="sr-only">Loading…</span></div>;
}
function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action: ReactNode }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-5 py-12 text-center"><div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">{icon}</div><h3 className="mt-5 text-lg font-semibold text-slate-900">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{text}</p><div className="mt-6">{action}</div></div>;
}
function CancelReservationDialog({ booking, busy, error, onClose, onConfirm }: {
  booking: Booking; busy: boolean; error: string; onClose: () => void; onConfirm: (reason: string) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState('');
  useBodyScrollLock(true);
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  // Same rule as the server (cancelOwnBooking). Older bookings have no policy and keep the tiers counted from booking.
  useEffect(() => {
    if (booking.paymentStatus !== 'paid') return;
    const paid = booking.totalPrice - (booking.balanceDue ?? 0);
    if (booking.cancellationPolicy) {
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(new Date());
      const percent = refundPercentFor(booking.cancellationPolicy, daysBetween(today, booking.startDate));
      setRefund(percent ? ` If you cancel now you get ${percent}% back: ${money(Math.round(paid * percent) / 100)} of ${money(paid)}.` : ` If you cancel now you get nothing back, under this booking's ${CANCELLATION_POLICIES[booking.cancellationPolicy as keyof typeof CANCELLATION_POLICIES]?.label ?? ''} policy.`);
      return;
    }
    api.getRefundRules().then((rules) => {
      const hours = (Date.now() - new Date(booking.createdAt).getTime()) / 3_600_000;
      const percent = rules.refundTiers.find((tier) => hours <= tier.withinHours)?.refundPercent ?? rules.laterRefundPercent;
      setRefund(` If you cancel now you get ${percent}% back: ${money(Math.round(booking.totalPrice * percent) / 100)} of ${money(booking.totalPrice)}.`);
    }).catch(() => {});
  }, [booking]);
  return <dialog ref={dialog} aria-labelledby="cancel-reservation-title" aria-describedby="cancel-reservation-description" onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }} className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl backdrop:bg-slate-950/50"><div className="flex items-start justify-between gap-4"><h2 id="cancel-reservation-title" className="text-xl font-semibold text-slate-900">Cancel this reservation?</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Close cancellation dialog" className="flex size-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-50"><X className="size-5" /></button></div><p id="cancel-reservation-description" className="mt-3 text-sm leading-6 text-slate-500">Your booking at {booking.listingTitle} ({booking.reference || booking.id}) will be cancelled and released.{booking.paymentStatus === 'paid' ? (refund || ' You paid online, so you get money back under our refund policy.') : ''}</p><form onSubmit={(event) => { event.preventDefault(); void onConfirm(reason); }}><label className="mt-4 block text-sm font-medium text-slate-700">Reason (optional)<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} minLength={3} disabled={busy} className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-600" /></label>{error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}<div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" autoFocus disabled={busy} onClick={onClose} className={secondaryButton}>Keep reservation</button><button type="submit" disabled={busy} className="min-h-11 rounded-lg bg-rose-600 px-4 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50">{busy ? 'Cancelling…' : 'Cancel reservation'}</button></div></form></dialog>;
}
