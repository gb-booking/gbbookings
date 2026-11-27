import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, LifeBuoy, Mail, MapPin, MessageCircle, MessageSquare, Phone, Send, Clock } from 'lucide-react';
import { api, type SupportCase } from '../../shared/api/api';
import type { Booking } from '../../types';

// Same env values as the footer; rows stay hidden until they are set.
const SUPPORT_PHONE = import.meta.env.VITE_SUPPORT_PHONE as string | undefined;
const SUPPORT_WHATSAPP = import.meta.env.VITE_SUPPORT_WHATSAPP as string | undefined;
const SUPPORT_EMAIL = 'info@gbbookings.com';

const FAQS: Array<[string, string]> = [
  ['How do I pay?', 'Pay on arrival: you pay the property, car partner or tour partner directly at check-in, at pickup, or when the tour starts. Each listing shows the ways they accept (cash, card, JazzCash, Easypaisa or bank transfer). Pay now online, by card or mobile wallet, is coming soon.'],
  ['When is my booking confirmed?', 'After you book, the partner has 24 hours to confirm. You get an email either way. If they do not answer in time, the request is cancelled and nothing is held.'],
  ['How do I cancel?', 'Go to My Bookings and cancel any time before the check-in, pickup or tour start date. On or after that day, contact the partner directly. Their phone and WhatsApp are on your voucher once they confirm.'],
  ['Can I change my dates?', 'Open the booking in My Bookings and press Request a change. You see the new price first, and the partner accepts or declines. If a partner suggests a change, nothing happens unless you accept it.'],
  ['How do I use a promo code?', 'Enter it on the review step of checkout. Codes are made by partners and work only on their own listings.'],
  ['How do I write a review?', 'Open My Bookings after your stay, rental or tour. You can review it once, up to 30 days after it ends.'],
  ['How do I list my hotel, homestay, cars or tours?', 'Choose "Become a partner", pick your type and upload your documents. We check them and you can start adding listings once you are approved.'],
];

type Category = 'booking' | 'payment' | 'vendor' | 'other';
const CATEGORIES: Array<[Category, string]> = [
  ['booking', 'Hotel / Stay Booking'],
  ['payment', 'Wallet or Card Payment'],
  ['vendor', 'Vendor Partnership'],
  ['other', 'General Query'],
];

/**
 * Restored from src/components/SupportCentre.tsx at 5372888^ ("24/7 Operations
 * Support", File Support Ticket form, ticket list + operator detail panel).
 *
 * Adaptation (no API change): the old file called GET/POST /api/support/tickets,
 * which does not exist in this codebase. Support now lives per booking —
 * GET/POST /api/v1/bookings/:id/support (see api.getBookingSupport /
 * writeBookingSupport) — so a "ticket" here is the support case on one of the
 * guest's bookings. The form therefore asks which booking the ticket is about,
 * and the subject/category are stored as the first lines of the opening
 * message. Nothing is faked: bookings with no case yet simply have no ticket.
 */
interface Ticket {
  booking: Booking;
  record: SupportCase;
  subject: string;
  category: string;
}

const parseSubject = (record: SupportCase): { subject: string; category: string } => {
  const first = record.messages.find((message) => message.from === 'guest');
  if (!first) return { subject: 'Support request', category: 'General Query' };
  const subjectMatch = first.body.match(/^Subject: (.*)$/m);
  const categoryMatch = first.body.match(/^Category: (.*)$/m);
  const body = first.body.replace(/^Subject: .*\n?/m, '').replace(/^Category: .*\n?/m, '').trim();
  return {
    subject: subjectMatch?.[1]?.trim() || body.split('\n')[0].slice(0, 80) || 'Support request',
    category: categoryMatch?.[1]?.trim() || 'General Query',
  };
};

const openingMessage = (record: SupportCase): string => {
  const first = record.messages.find((message) => message.from === 'guest');
  if (!first) return '';
  return first.body.replace(/^Subject: .*\n?/m, '').replace(/^Category: .*\n?/m, '').trim() || first.body;
};

export default function SupportCentre() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // New ticket form (old field names kept)
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<Category>('booking');
  const [bookingId, setBookingId] = useState('');
  const [message, setMessage] = useState('');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [formNotice, setFormNotice] = useState('');

  // Chat message input
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState('');

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [upcoming, past] = await Promise.all([
        api.getBookingsPage(1, 'upcoming').catch(() => null),
        api.getBookingsPage(1, 'past').catch(() => null),
      ]);
      const all = [...(upcoming?.data ?? []), ...(past?.data ?? [])];
      setBookings(all);
      const found: Ticket[] = [];
      await Promise.all(all.map(async (booking) => {
        try {
          const record = await api.getBookingSupport(booking.id);
          if (record) found.push({ booking, record, ...parseSubject(record) });
        } catch { /* no case on this booking yet */ }
      }));
      found.sort((a, b) => Date.parse(b.record.updatedAt) - Date.parse(a.record.updatedAt));
      setTickets(found);
      setSelected((current) => {
        if (current) return found.find((ticket) => ticket.booking.id === current.booking.id) ?? null;
        return found[0] ?? null;
      });
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : 'We couldn’t load your support tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchTickets(); }, [fetchTickets]);

  // Poll the open ticket for operator replies.
  useEffect(() => {
    if (!selected) return undefined;
    const interval = setInterval(async () => {
      try {
        const record = await api.getBookingSupport(selected.booking.id);
        if (!record) return;
        setSelected((current) => current && current.booking.id === selected.booking.id
          ? { ...current, record, ...parseSubject(record) } : current);
        setTickets((items) => items.map((ticket) => ticket.booking.id === selected.booking.id
          ? { ...ticket, record, ...parseSubject(record) } : ticket));
      } catch { /* keep showing the last known messages */ }
    }, 15000);
    return () => clearInterval(interval);
  }, [selected?.booking.id]);

  const handleCreateTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!subject.trim() || !message.trim() || !bookingId) return;
    setSubmittingTicket(true);
    setFormNotice('');
    try {
      const categoryLabel = CATEGORIES.find(([id]) => id === category)?.[1] ?? 'General Query';
      const record = await api.writeBookingSupport(
        bookingId,
        `Subject: ${subject.trim()}\nCategory: ${categoryLabel}\n\n${message.trim()}`,
      );
      const booking = bookings.find((item) => item.id === bookingId);
      if (booking) {
        const ticket: Ticket = { booking, record, ...parseSubject(record) };
        setTickets((items) => [ticket, ...items.filter((item) => item.booking.id !== bookingId)]);
        setSelected(ticket);
      }
      setSubject('');
      setMessage('');
      setFormNotice('Support request logged. An operator will coordinate shortly.');
    } catch (reason) {
      setFormNotice(reason instanceof Error ? reason.message : 'Your ticket could not be filed. Please try again.');
    } finally {
      setSubmittingTicket(false);
    }
  };

  const handleSendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!replyText.trim() || !selected) return;
    setSendingReply(true);
    setReplyError('');
    try {
      const record = await api.writeBookingSupport(selected.booking.id, replyText.trim());
      const updated: Ticket = { ...selected, record, ...parseSubject(record) };
      setSelected(updated);
      setTickets((items) => items.map((ticket) => ticket.booking.id === selected.booking.id ? updated : ticket));
      setReplyText('');
    } catch (reason) {
      setReplyError(reason instanceof Error ? reason.message : 'Your message could not be sent. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const contacts = [
    SUPPORT_WHATSAPP && { href: `https://wa.me/${SUPPORT_WHATSAPP}`, icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', external: true },
    SUPPORT_PHONE && { href: `tel:${SUPPORT_PHONE.replace(/\s/g, '')}`, icon: Phone, label: 'Phone', value: SUPPORT_PHONE },
    { href: `mailto:${SUPPORT_EMAIL}`, icon: Mail, label: 'Email', value: SUPPORT_EMAIL },
  ].filter(Boolean) as Array<{ href: string; icon: typeof Mail; label: string; value: string; external?: boolean }>;

  const replies = selected ? selected.record.messages.filter((m, index) => !(index === 0 && m.from === 'guest')) : [];

  return (
    <div id="support-centre-view" className="space-y-8 pb-16">
      {/* Intro Header — restored from history: "24/7 Operations Support".
          The demo's green hero and its toll-free 05811-455-200 / WhatsApp
          +92 345 9998877 numbers were never in this repo's history, so they
          are not shown here; contact rows below use the real env values. */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5 sm:gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
          <LifeBuoy className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#0F172A] uppercase tracking-tight">24/7 Operations Support</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Real-time support coordination with regional operators, mountain guides, and payment clearing offices.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8" id="support-main-grid">
        {/* Left Column: Tickets List and Filing form */}
        <aside className="lg:col-span-4 space-y-6" id="support-left-sidebar">
          {/* Support Ticket File Form */}
          <form onSubmit={handleCreateTicket} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs" id="form-file-ticket">
            <h3 className="text-xs font-bold uppercase text-[#0F172A] border-b border-slate-100 pb-2.5 flex items-center gap-1.5 tracking-wider">
              File Support Ticket
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ticket-booking">Related booking</label>
              <select
                id="ticket-booking"
                value={bookingId}
                onChange={(e) => setBookingId(e.target.value)}
                required
                disabled={bookings.length === 0}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white min-h-[44px] cursor-pointer disabled:opacity-60"
              >
                <option value="">{bookings.length === 0 ? 'No bookings yet — book a stay, car or tour first' : 'Choose a booking'}</option>
                {bookings.map((booking) => (
                  <option key={booking.id} value={booking.id}>{booking.reference || booking.id} · {booking.listingTitle}</option>
                ))}
              </select>
              <p className="text-[11px] leading-relaxed text-slate-500">Support cases are kept on the booking they belong to, so the operator sees your trip details.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ticket-subject">Subject</label>
              <input
                type="text"
                required
                id="ticket-subject"
                placeholder="e.g. Booking b-991 Airport Shuttle"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white min-h-[44px]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ticket-category">Category</label>
              <select
                id="ticket-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white min-h-[44px] cursor-pointer"
              >
                {CATEGORIES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500" htmlFor="ticket-message">Your Query / Requirements</label>
              <textarea
                required
                id="ticket-message"
                rows={3}
                placeholder="Elaborate your request details. Include booking IDs for rapid response clearance..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:border-[#0F172A] focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              id="btn-file-ticket"
              disabled={submittingTicket || bookings.length === 0}
              className="w-full bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-3 px-6 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider min-h-[44px] transition-colors shadow-xs disabled:opacity-50"
            >
              <span>{submittingTicket ? 'Filing...' : 'Transmit Ticket'}</span> <ArrowRight className="w-4 h-4" />
            </button>
            {formNotice && <p role="status" className="text-xs leading-relaxed text-slate-600">{formNotice}</p>}
          </form>

          {/* Tickets List */}
          <div className="space-y-3" id="active-tickets-list">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Your Support Tickets</h4>
            {loading ? (
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Syncing tickets...</p>
            ) : loadError ? (
              <p role="alert" className="text-xs text-rose-700">{loadError}</p>
            ) : tickets.length === 0 ? (
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">No active support logs.</p>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => {
                  const isSelected = selected?.booking.id === ticket.booking.id;
                  return (
                    <button
                      key={ticket.booking.id}
                      id={`ticket-selector-btn-${ticket.booking.id}`}
                      onClick={() => setSelected(ticket)}
                      className={`w-full text-left p-3.5 sm:p-4 rounded-xl border flex flex-col justify-between transition-all cursor-pointer shadow-xs ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/40'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <span className="text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded">ID: {ticket.booking.reference || ticket.booking.id}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border ${
                          ticket.record.status === 'open'
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>{ticket.record.status}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1 break-words">{ticket.subject}</h4>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">{new Date(ticket.record.updatedAt).toLocaleDateString()}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Column: Live Chat Operator Desk */}
        <main className="lg:col-span-8 flex flex-col justify-between" id="chat-operator-desk">
          {selected ? (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col justify-between min-h-[420px] sm:min-h-[500px] h-[460px] sm:h-[520px] shadow-xs relative overflow-hidden" id="ticket-chat-frame">
              <div className="bg-slate-50 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center truncate">
                    <Clock className="w-4 h-4 mr-1.5 text-indigo-600 shrink-0" />
                    Operator Connection: {selected.booking.reference || selected.booking.id}
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 font-bold uppercase tracking-wider">Category: {selected.category.toUpperCase()} • Status: {selected.record.status.toUpperCase()} • {selected.booking.listingTitle}</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px] sm:text-xs text-slate-500 font-bold uppercase tracking-wider shrink-0">
                  <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse shrink-0" />
                  <span>Operations Desk Online</span>
                </div>
              </div>

              <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4" id="chat-messages-viewport">
                <div className="flex items-start space-x-2.5 sm:space-x-3 max-w-[95%] sm:max-w-lg">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-indigo-600 text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shrink-0">YOU</div>
                  <div className="bg-indigo-50/50 border border-indigo-100 p-3 sm:p-3.5 rounded-xl break-words">
                    <p className="text-[10px] font-bold text-indigo-600 font-mono uppercase tracking-wider">Original Inquiry</p>
                    <p className="text-xs text-slate-700 mt-1">{openingMessage(selected.record)}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-1.5">{new Date(selected.record.messages[0]?.at ?? selected.record.updatedAt).toLocaleTimeString()}</p>
                  </div>
                </div>

                {replies.map((rep, index) => {
                  const isOperator = rep.from === 'admin';
                  return (
                    <div
                      key={`${rep.at}-${index}`}
                      className={`flex items-start space-x-2.5 sm:space-x-3 ${isOperator ? 'justify-start' : 'justify-end'}`}
                    >
                      {isOperator && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-slate-800 flex items-center justify-center shrink-0"><LifeBuoy className="w-4 h-4 text-indigo-400" /></div>
                      )}
                      <div className={`p-3 sm:p-3.5 rounded-xl max-w-[85%] sm:max-w-md break-words ${
                        isOperator
                          ? 'bg-slate-50 border border-slate-200 text-slate-700'
                          : 'bg-indigo-50 border border-indigo-100 text-slate-800'
                      }`}>
                        <p className={`text-[9px] font-bold tracking-wider mb-1 uppercase ${isOperator ? 'text-slate-400' : 'text-indigo-600'}`}>
                          {isOperator ? 'Operations Desk' : 'You'}
                        </p>
                        <p className="text-xs leading-relaxed">{rep.body}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1.5">{new Date(rep.at).toLocaleTimeString()}</p>
                      </div>
                      {!isOperator && (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0F172A] text-white font-bold text-[11px] sm:text-xs flex items-center justify-center shrink-0">YOU</div>
                      )}
                    </div>
                  );
                })}
                {selected.record.status === 'resolved' && (
                  <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-900"><CheckCircle2 className="size-4 shrink-0" />We marked this as solved. Write again below if you still need help.</p>
                )}
              </div>

              <form onSubmit={handleSendReply} className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200" id="form-chat-send">
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    required
                    id="chat-reply-input"
                    placeholder="Type your message to operations..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-600 min-h-[44px]"
                  />
                  <button
                    type="submit"
                    id="btn-chat-send"
                    disabled={sendingReply}
                    className="bg-[#0F172A] hover:bg-slate-800 text-white font-bold py-2.5 px-3.5 sm:px-4 rounded-xl text-xs flex items-center justify-center cursor-pointer shadow-xs min-h-[44px] min-w-[44px] disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                {replyError && <p role="alert" className="mt-2 text-xs text-rose-700">{replyError}</p>}
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-12 text-center flex flex-col items-center justify-center min-h-[340px] h-[460px] sm:h-[520px] shadow-xs" id="chat-desk-empty">
              <MessageSquare className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400 mb-3 sm:mb-4" />
              <h4 className="font-bold text-sm sm:text-base text-[#0F172A] uppercase tracking-tight">Select Coordinates To Initiate</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed mt-1">Select one of your support tickets on the left sidebar to communicate directly with our regional desks.</p>
            </div>
          )}
        </main>
      </div>

      {/* Contact rows + FAQs kept from the current page: the old SupportCentre
          file at 5372888^ has no FAQ, Legal & Trust Policies or Why Choose
          block (checked with git grep), so those demo blocks are not restored
          from history. The current FAQ copy is real and stays. */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        <aside className="lg:col-span-4 space-y-3">
          {contacts.map(({ href, icon: Icon, label, value, external }) => (
            <a key={label} href={href} {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
              className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-indigo-300 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-800 wrap-break-word">{value}</p>
              </div>
            </a>
          ))}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Office</p>
              <p className="text-sm font-semibold text-slate-800">Skardu, Gilgit Baltistan, Pakistan</p>
            </div>
          </div>
        </aside>

        <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100" id="support-faqs">
          <h3 className="text-xs font-bold uppercase text-[#0F172A] tracking-wider px-4 sm:px-5 py-3.5">Frequently asked questions</h3>
          {FAQS.map(([question, answer]) => (
            <details key={question} className="group px-4 sm:px-5 py-3.5">
              <summary className="flex items-center justify-between gap-3 cursor-pointer list-none text-sm font-semibold text-slate-800">
                {question}
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">{answer}</p>
            </details>
          ))}
        </section>
      </div>
    </div>
  );
}
