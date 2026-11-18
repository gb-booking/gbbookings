import { useState, type ReactNode } from 'react';
import { ArrowLeft, Banknote, BarChart3, Bot, Briefcase, Building2, CalendarCheck, CalendarDays, Car, FileText, House, LayoutDashboard, LogOut, MessageSquare, Mountain, PanelLeftClose, PanelLeftOpen, Plus, Receipt, RefreshCw, ShieldCheck, Sparkles, Star, Tags, TicketPercent, Users } from 'lucide-react';

export type VendorTab = 'overview' | 'properties' | 'new-property' | 'reservations' | 'messages' | 'reviews' | 'promo-codes' | 'reports' | 'payouts' | 'team' | 'business' | 'security'
  | 'availability' | 'rooms-pricing' | 'channel-manager' | 'payment-requests' | 'ai-pricing' | 'ai-content' | 'ai-assistant' | 'documents';
export type PartnerKind = 'hotel' | 'homestay' | 'car' | 'tour';

/** Areas the server grants this team member (GET /vendors/me → membership.access). */
export type MemberArea = 'listings' | 'reservations' | 'reports' | 'team' | 'business';
const TAB_AREA: Partial<Record<VendorTab, MemberArea>> = {
  overview: 'listings', properties: 'listings', 'new-property': 'listings', reservations: 'reservations', messages: 'reservations', reviews: 'listings', 'promo-codes': 'listings', reports: 'reports', payouts: 'reports', team: 'team', business: 'business',
  availability: 'listings', 'rooms-pricing': 'listings', 'channel-manager': 'listings', 'payment-requests': 'reports', 'ai-pricing': 'listings', 'ai-content': 'listings', 'ai-assistant': 'listings', documents: 'listings',
};
// Before the account loads, show the owner's layout; security is open to everyone.
export const canOpen = (access: MemberArea[] | undefined, tab: VendorTab) => !TAB_AREA[tab] || !access || access.includes(TAB_AREA[tab]!);

/** Words that change with the partner type; one account is one type. */
export const partnerWords = (kind: PartnerKind) => ({
  hotel: { one: 'hotel', many: 'Hotels & rooms', bookings: 'Reservations', partner: 'Hotel partner' },
  homestay: { one: 'homestay', many: 'My homestays', bookings: 'Reservations', partner: 'Homestay host' },
  car: { one: 'car', many: 'Cars & fleet', bookings: 'Rentals', partner: 'Car partner' },
  tour: { one: 'tour', many: 'My tours', bookings: 'Bookings', partner: 'Tour partner' },
}[kind]);

// Menus follow the Hotel Owner, Tour Company and Vehicle Provider sidebars in the Console SRS.
const navGroups = (kind: PartnerKind): Array<{ title?: string; items: Array<{ id: VendorTab; label: string; icon: typeof Star }> }> => {
  const words = partnerWords(kind);
  const stay = kind === 'hotel' || kind === 'homestay';
  return [
    { items: [
      { id: 'overview', label: 'Overview', icon: LayoutDashboard },
      { id: 'reservations', label: words.bookings, icon: CalendarCheck },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
    ] },
    { title: stay ? 'Property' : kind === 'car' ? 'Fleet' : 'Tours', items: [
      { id: 'properties', label: words.many, icon: kind === 'car' ? Car : kind === 'tour' ? Mountain : kind === 'homestay' ? House : Building2 },
      { id: 'new-property', label: kind === 'car' ? 'Add vehicle' : kind === 'tour' ? 'Create tour' : 'List new property', icon: Plus },
      { id: 'availability', label: stay ? 'Availability calendar' : 'Availability', icon: CalendarDays },
      ...(stay ? [{ id: 'rooms-pricing' as const, label: 'Rooms & pricing', icon: Tags }] : []),
      ...(kind !== 'tour' ? [{ id: 'channel-manager' as const, label: 'Channel manager', icon: RefreshCw }] : []),
    ] },
    { title: 'Grow', items: [
      { id: 'reviews', label: 'Guest reviews', icon: Star },
      { id: 'promo-codes', label: 'Promo codes', icon: TicketPercent },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
      { id: kind === 'tour' ? 'ai-content' : 'ai-pricing', label: kind === 'tour' ? 'AI content' : 'AI pricing', icon: Sparkles },
      { id: 'ai-assistant', label: 'AI assistant', icon: Bot },
    ] },
    { title: 'Business', items: [
      { id: 'payouts', label: 'Payments & earnings', icon: Banknote },
      { id: 'payment-requests', label: 'Payment requests', icon: Receipt },
      { id: 'team', label: 'Staff', icon: Users },
      { id: 'documents', label: 'Documents', icon: FileText },
      { id: 'business', label: 'Business profile', icon: Briefcase },
      { id: 'security', label: 'Account settings', icon: ShieldCheck },
    ] },
  ];
};

const titles = (kind: PartnerKind): Record<VendorTab, [string, string]> => {
  const { one, many, bookings } = partnerWords(kind);
  return {
    overview: ['', ''],
    properties: [many, kind === 'car' ? 'Your cars, daily prices, fleet counts and reviews by GBBookings.' : kind === 'tour' ? 'Your tours, prices, seats and departure dates.' : 'Your properties, room categories and reviews by GBBookings.'],
    'new-property': [`Add a ${one}`, kind === 'car' ? 'Create a car draft with its price and photos, then submit it for review.' : kind === 'tour' ? 'Create a tour draft with its itinerary, price and dates, then submit it for review.' : 'Create a property draft, add its rooms, then submit it for review.'],
    reservations: [bookings, kind === 'car' ? 'Answer rental requests and manage pickups and returns.' : kind === 'tour' ? 'Answer booking requests and manage who starts a tour today.' : 'Answer booking requests and manage arrivals and stays.'],
    messages: ['Messages', 'Questions from guests, before and after they book.'],
    reviews: ['Guest reviews', 'Read what guests say, reply publicly, or report a review that breaks the rules.'],
    'promo-codes': ['Promo codes', `Give guests a discount code. Guests enter it at checkout and pay the reduced total at ${kind === 'car' ? 'pickup' : kind === 'tour' ? 'the start of the tour' : 'your property'}.`],
    payouts: ['Payments & earnings', 'What GBBookings owes you and what you owe it, booking by booking. Each statement doubles as the commission invoice.'],
    reports: ['Reports', `Occupancy and money per ${one} for any dates.`],
    team: ['Staff', 'Give managers and reception staff their own sign-in.'],
    business: ['Business profile', 'Your verified business details. Changes are approved by GBBookings before they apply.'],
    security: ['Account settings', 'Manage email verification, your password and active sessions.'],
    availability: [kind === 'tour' ? 'Availability' : 'Availability calendar', kind === 'tour' ? 'Departure dates, seats and closed days for each tour.' : `Open and close dates for each ${kind === 'car' ? 'car' : 'room'}. Booked dates are filled in for you.`],
    'rooms-pricing': ['Rooms & pricing', 'Room categories, prices, weekend and seasonal rates.'],
    'channel-manager': ['Channel manager', 'Link the calendars of other booking sites so the same dates are never sold twice.'],
    'payment-requests': ['Payment requests', 'Ask a guest for a balance, an advance, a fee or an extra service on their booking. You collect the money and mark it paid.'],
    'ai-pricing': ['AI pricing', 'Price ideas from your recent bookings and similar listings nearby, and a summary of what guests say.'],
    'ai-content': ['AI content', 'A rewritten title and description for your tour, and a summary of what guests say. You edit and save it yourself.'],
    'ai-assistant': ['AI assistant', 'Ask how to do something on GBBookings.'],
    documents: ['Documents', 'Every photo and document your business has uploaded.'],
  };
};

const NAV_KEY = 'gb-partner-nav-open';

export default function VendorWorkspace({ tab, onTab, businessName, status, access, kind = 'hotel', badges = {}, userName, userEmail, onBrowse, onSignOut, hideHeading = false, children }: {
  tab: VendorTab; access?: MemberArea[]; kind?: PartnerKind; badges?: Partial<Record<VendorTab, number>>; hideHeading?: boolean; onTab: (tab: VendorTab) => void; businessName?: string;
  status?: string; userName: string; userEmail: string; onBrowse: () => void;
  onSignOut: () => Promise<void>; children: ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(() => { try { return localStorage.getItem(NAV_KEY) !== '0'; } catch { return true; } });
  const toggleNav = () => setNavOpen((open) => { try { localStorage.setItem(NAV_KEY, open ? '0' : '1'); } catch { /* storage blocked */ } return !open; });
  const words = partnerWords(kind);
  const heading = titles(kind)[tab];
  // Below md the menu is always the icon rail; the toggle only widens it on larger screens.
  const labelClass = navOpen ? 'hidden md:block' : 'hidden';
  const iconsOnly = navOpen ? 'justify-center md:justify-start' : 'justify-center';
  const initials = (businessName || words.one).split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-dvh bg-[#F4F5F1] font-jakarta text-[#17211B]">
      <nav aria-label="Partner navigation" className={`sticky top-0 flex h-dvh w-[68px] shrink-0 flex-col gap-4 overflow-y-auto bg-[#002816] px-2.5 py-5 text-[#CFE3D6] transition-[width] ${navOpen ? 'md:w-64' : ''}`}>
        <div className="flex items-center gap-2.5 px-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#E8890C] text-sm font-extrabold text-white" aria-hidden="true">{initials}</span>
          <span className={`${labelClass} min-w-0 leading-tight`}>
            <span className="block truncate text-[15px] font-extrabold text-white">{businessName || `Your ${words.one} business`}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8FBFA0]"><span className={`size-1.5 rounded-full ${status === 'approved' ? 'bg-emerald-400' : 'bg-amber-400'}`} />{status === 'approved' ? words.partner : status ?? 'Loading…'}</span>
          </span>
        </div>
        <button type="button" onClick={toggleNav} aria-expanded={navOpen} aria-label={navOpen ? 'Collapse menu' : 'Expand menu'} title={navOpen ? 'Collapse menu' : 'Expand menu'}
          className={`hidden min-h-10 items-center gap-2.5 rounded-lg border border-[#1F4A33] px-3 text-[13px] font-semibold hover:bg-white/5 md:flex ${navOpen ? '' : 'justify-center'}`}>
          {navOpen ? <PanelLeftClose className="size-[18px] shrink-0" /> : <PanelLeftOpen className="size-[18px] shrink-0" />}<span className={labelClass}>Collapse menu</span>
        </button>
        {navGroups(kind).map((group, index) => {
          const items = group.items.filter((item) => canOpen(access, item.id));
          if (!items.length) return null;
          return <div key={index} className="flex flex-col gap-0.5">
            {group.title && <p className={`${labelClass} px-3 pb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#7FA88F]`}>{group.title}</p>}
            {group.title && <div className={`${navOpen ? 'md:hidden' : ''} mx-2 mb-2 h-px bg-[#1F4A33]`} />}
            {items.map(({ id, label, icon: Icon }) => {
              const disabled = status !== undefined && status !== 'approved' && id !== 'overview' && id !== 'security' && id !== 'business';
              const current = tab === id;
              const badge = badges[id];
              return <button key={id} type="button" disabled={disabled} onClick={() => onTab(id)} aria-current={current ? 'page' : undefined}
                title={disabled ? 'Unavailable while your partner account is not active' : label} aria-label={label}
                className={`relative flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${current ? 'bg-[#0B4A2C] text-white' : 'text-[#CFE3D6] hover:bg-white/5 hover:text-white'} ${iconsOnly}`}>
                <Icon className="size-[19px] shrink-0" />
                <span className={`${labelClass} flex-1 text-left`}>{label}</span>
                {!!badge && <span className={`${labelClass} rounded-full bg-[#F59E0B] px-2 text-xs font-extrabold text-[#2A1A00]`}>{badge}</span>}
                {!!badge && <span aria-hidden="true" className={`${navOpen ? 'md:hidden' : ''} absolute right-2 top-2 size-2 rounded-full bg-[#F59E0B]`} />}
              </button>;
            })}
          </div>;
        })}
        <div className="mt-auto flex flex-col gap-0.5 border-t border-[#1F4A33] pt-4">
          <button type="button" onClick={onBrowse} title="Browse GBBookings" aria-label="Browse GBBookings" className={`flex min-h-[42px] items-center gap-3 rounded-lg px-3 text-sm font-semibold text-[#CFE3D6] hover:bg-white/5 hover:text-white ${iconsOnly}`}><ArrowLeft className="size-[19px] shrink-0" /><span className={labelClass}>Browse GBBookings</span></button>
          <div className={`flex items-center gap-2.5 px-1 pt-2 ${navOpen ? 'flex-col md:flex-row' : 'flex-col'}`}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F59E3B] font-extrabold text-[#17211B]" aria-hidden="true">{userName.charAt(0).toUpperCase() || 'P'}</span>
            <span className={`${labelClass} min-w-0 flex-1 text-[13px] leading-tight`}><strong className="block truncate text-white">{userName}</strong><span className="block truncate text-[#8FBFA0]">{userEmail}</span></span>
            <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="flex size-9 shrink-0 items-center justify-center rounded-lg hover:bg-white/10 hover:text-white"><LogOut className="size-4" /></button>
          </div>
        </div>
      </nav>
      <main className="min-w-0 flex-1 space-y-6 px-4 pb-12 pt-7 sm:px-8">
        {!hideHeading && tab !== 'overview' && <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h1 className="text-3xl font-extrabold tracking-tight">{heading[0]}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#5B6B61]">{heading[1]}</p></div>
          {status === 'approved' && tab === 'properties' && canOpen(access, 'new-property') && <button type="button" onClick={() => onTab('new-property')} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#006F3C] px-4 text-sm font-bold text-white hover:bg-[#005c32]"><Plus className="size-4" />Add {words.one}</button>}
        </div>}
        {children}
      </main>
    </div>
  );
}
