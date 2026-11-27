import { useEffect, useRef, useState } from 'react';
import { Building2, CalendarDays, ChevronDown, Heart, MessageSquare, Compass, Globe, HelpCircle, LogOut, Menu, ShieldCheck, UserRound, X, Home, Car, MapPin, Mountain, Tag, Sparkles, Headset, Smartphone } from 'lucide-react';
import { useLanguage } from '../../app/LanguageContext';
import GBLogo from './GBLogo';
import { api } from '../api/api';
import { onMessage } from '../api/realtime';
import Select from './Select';
import NavbarMegaMenu, { type MegaTab } from './NavbarMegaMenu';

interface NavbarProps {
  currentView: string; setView: (view: string) => void; userEmail: string; userName?: string;
  isLoggedIn: boolean; isStaff?: boolean; isPartner?: boolean;
  onOpenNotifications: () => void; onOpenAuthModal: (mode?: 'signin' | 'register') => void;
  onSignOut: () => void | Promise<void>;
}
export default function Navbar({ currentView, setView, userName, userEmail, isLoggedIn, isStaff = false, isPartner = false, onOpenAuthModal, onSignOut }: NavbarProps) {
  const { language, requestLanguageChange, isRtl } = useLanguage();
  const [activeMega, setActiveMega] = useState<MegaTab | null>(null);
  const [megaClosing, setMegaClosing] = useState(false);
  const megaTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moreTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keepMegaOpen = () => { clearTimeout(megaTimer.current); clearTimeout(exitTimer.current); setMegaClosing(false); };
  const dismissMega = () => { clearTimeout(megaTimer.current); clearTimeout(exitTimer.current); setActiveMega(null); setMegaClosing(false); };
  const openMega = (tab: MegaTab) => { keepMegaOpen(); setActiveMega(tab); setMoreOpen(false); setAccountOpen(false); };
  const leaveMega = () => {
    clearTimeout(megaTimer.current);
    megaTimer.current = setTimeout(() => {
      setMegaClosing(true);
      exitTimer.current = setTimeout(() => { setActiveMega(null); setMegaClosing(false); }, 150);
    }, 500);
  };
  const openMore = () => { clearTimeout(moreTimer.current); dismissMega(); setMoreOpen(true); setAccountOpen(false); };
  const leaveMore = () => { clearTimeout(moreTimer.current); moreTimer.current = setTimeout(() => setMoreOpen(false), 200); };
  useEffect(() => () => { clearTimeout(megaTimer.current); clearTimeout(exitTimer.current); clearTimeout(moreTimer.current); }, []);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const header = useRef<HTMLElement>(null);
  // Refreshed on navigation (so it clears after reading the inbox), on pushed messages, when the inbox opens a thread, and every minute where there is no socket.
  useEffect(() => {
    if (!isLoggedIn || isStaff) { setUnread(0); return; }
    const refresh = () => api.unreadMessages().then((counts) => setUnread(counts.guest + counts.partner)).catch(() => undefined);
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    const stop = onMessage(() => void refresh());
    window.addEventListener('gb:messages-read', refresh);
    return () => { window.clearInterval(timer); stop(); window.removeEventListener('gb:messages-read', refresh); };
  }, [isLoggedIn, isStaff, currentView]);
  const unreadLabel = unread > 9 ? '9+' : String(unread);
  const displayName = userName || userEmail.split('@')[0] || 'My account';
  const initials = displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const links = [
    { id: 'hotels', label: isRtl ? 'ہوٹلز' : 'Hotels', icon: Building2 },
    { id: 'homestays', label: isRtl ? 'ہوم اسٹیز' : 'Homestays', icon: Home },
    { id: 'cars', label: isRtl ? 'گاڑیاں' : 'Cars', icon: Car },
    { id: 'tours', label: isRtl ? 'ٹورز' : 'Tours', icon: Mountain },
    // Travel Agency: restored nav item (old Navbar had no agency item in history;
    // the 'agencies' route is being added to App.tsx by a parallel worker).
    // It has no mega-menu — see isMegaTab guard below.
    { id: 'agencies', label: isRtl ? 'ٹریول ایجنسی' : 'Travel Agency', icon: Compass },
  ];
  // Only these tabs open the mega-menu; 'agencies' navigates directly.
  const isMegaTab = (id: string): id is MegaTab => id === 'hotels' || id === 'homestays' || id === 'cars' || id === 'tours' || id === 'destinations' || id === 'offers';
  // Approved partners go to their dashboard; everyone else (including signed-out visitors) to the partner page.
  const partnerLink = isPartner ? { view: 'vendor-dashboard', label: 'Partner dashboard' } : { view: 'become-partner', label: 'Become a partner' };
  const extraLinks = [
    // Old Navbar "More" dropdown (5372888^): My Bookings, Partner dashboard, Support.
    { id: 'bookings', label: 'My Bookings', icon: CalendarDays },
    { id: partnerLink.view, label: partnerLink.label, icon: Building2 },
    { id: 'support', label: 'Help & support', icon: HelpCircle },
  ];
  const navigate = (view: string) => { dismissMega(); clearTimeout(moreTimer.current); setMobileOpen(false); setAccountOpen(false); setMoreOpen(false); setView(view); };
  useEffect(() => { dismissMega(); setMobileOpen(false); setAccountOpen(false); setMoreOpen(false); setError(''); }, [currentView, isLoggedIn]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) { dismissMega(); setMobileOpen(false); setAccountOpen(false); setMoreOpen(false); }
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { dismissMega(); setMobileOpen(false); setAccountOpen(false); setMoreOpen(false); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeEscape);
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeEscape); };
  }, []);
  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setError('');
    try { await onSignOut(); }
    catch { setError('We couldn’t sign you out. Please try again.'); }
    finally { setSigningOut(false); }
  };

  const accountControl = (placement: 'utility' | 'mobile') => (<div className="relative"><button type="button" aria-expanded={accountOpen} aria-controls={`nav-account-${placement}`} onClick={() => { dismissMega(); setAccountOpen(!accountOpen); setMoreOpen(false); }} className={placement === "utility" ? "flex min-h-8 items-center gap-2 text-slate-200 transition-colors hover:text-white" : "flex size-10 items-center justify-center rounded-xl bg-[#0A182E] text-white shadow-sm"}><span className="relative flex size-8 items-center justify-center rounded-full bg-emerald-50 text-xs font-semibold text-emerald-800">{initials}{unread > 0 && <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">{unreadLabel}</span>}</span><span className="hidden max-w-28 truncate text-xs font-semibold lg:block">{displayName.split(' ')[0]}</span><ChevronDown className="hidden size-3.5 text-current sm:block" /><span className="sr-only">Account menu{unread > 0 ? `, ${unread} unread messages` : ''}</span></button>
            {accountOpen && <div id={`nav-account-${placement}`} className="absolute -right-12 top-full z-70 mt-3 w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg sm:right-0"><div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-semibold text-slate-900">{displayName}</p><p className="mt-1 truncate text-xs text-slate-500">{userEmail}</p></div>{isStaff ? <button type="button" onClick={() => navigate('admin-dashboard')} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><UserRound className="size-4 text-slate-400" />Admin workspace</button> : <><button type="button" onClick={() => navigate('bookings')} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><CalendarDays className="size-4 text-slate-400" />My bookings</button><button type="button" onClick={() => navigate('inbox')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><MessageSquare className="size-4 text-slate-400" />Messages{unread > 0 && <span className="ml-auto rounded-full bg-rose-600 px-2 py-0.5 text-xs font-semibold text-white">{unreadLabel}</span>}</button><button type="button" onClick={() => navigate('profile')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><UserRound className="size-4 text-slate-400" />Profile</button><button type="button" onClick={() => navigate('saved')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Heart className="size-4 text-slate-400" />Saved stays</button></>}{isPartner && !isStaff && <button type="button" onClick={() => navigate('vendor-dashboard')} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-slate-700 hover:bg-slate-50"><Building2 className="size-4 text-slate-400" />Partner dashboard</button>}<button type="button" onClick={() => void signOut()} disabled={signingOut} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"><LogOut className="size-4" />{signingOut ? 'Signing out…' : 'Sign out'}</button>{error && <p role="alert" className="px-3 py-2 text-xs leading-5 text-rose-700">{error}</p>}</div>}
          </div>);

  return <header ref={header} id="app-navbar" className="sticky top-0 z-50 w-full border-b border-[#E2E8F0] bg-white shadow-md" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { dismissMega(); setMoreOpen(false); } }}>
    <div id="nav-utility-bar" className="hidden border-b border-slate-800/80 bg-[#0A182E] text-slate-200 sm:block">
      <div className="mx-auto flex min-h-10 max-w-[1440px] items-center justify-between gap-4 px-4 py-1 text-[11px] lg:px-6 xl:text-xs">
        <div className="flex min-w-0 items-center gap-3 text-slate-300 lg:gap-4">
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 shrink-0 text-white" /><span>Best Price Guarantee</span></span>
          <span className="hidden h-3.5 w-px bg-slate-700 xl:block" />
          <span className="hidden items-center gap-1.5 xl:flex"><CalendarDays className="size-3.5 shrink-0 text-white" />Free cancellation on most bookings</span>
          <span className="hidden h-3.5 w-px bg-slate-700 lg:block" />
          <button type="button" onClick={() => navigate('support')} className="hidden items-center gap-1.5 transition-colors hover:text-white lg:flex"><Headset className="size-3.5 text-white" />24/7 Support – We&apos;re always here</button>
        </div>
        <div className="flex shrink-0 items-center gap-3 font-semibold lg:gap-4">
          <button type="button" onClick={() => navigate('support')} className="hidden items-center gap-1.5 hover:text-white xl:flex"><Smartphone className="size-3.5 text-slate-400" />Download App</button>
          <button type="button" onClick={() => navigate('bookings')} className="hidden items-center gap-1.5 hover:text-white lg:flex"><CalendarDays className="size-3.5 text-slate-400" />My Bookings</button>
          <span className="text-slate-300">PKR</span>
          <label className="flex items-center gap-1.5"><Globe className="size-3.5" /><span className="sr-only">Language</span><Select aria-label="Language" value={language} onChange={(event) => requestLanguageChange(event.target.value as 'en' | 'ur')} className="min-h-8 cursor-pointer bg-transparent text-xs text-slate-200 outline-none"><option value="en">English</option><option value="ur">اردو</option></Select></label>
          {!isStaff && <button type="button" onClick={() => navigate('saved')} className="flex items-center gap-1.5 hover:text-white"><Heart className="size-3.5" /><span className="hidden lg:inline">Wishlist</span></button>}
          <span className="h-3.5 w-px bg-slate-700" />
          {isLoggedIn ? accountControl('utility') : <><button type="button" onClick={() => onOpenAuthModal('signin')} className="flex min-h-8 items-center gap-1.5 hover:text-white"><UserRound className="size-3.5" />Sign In</button><button type="button" onClick={() => onOpenAuthModal('register')} className="min-h-8 rounded bg-[#00A651] px-3 py-1 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#008E45]">Register</button></>}
        </div>
      </div>
    </div>
    <div className="relative mx-auto flex min-h-16 max-w-[1440px] items-center justify-between gap-2 px-3 sm:min-h-18 sm:px-4 lg:gap-3 lg:px-6">
      <button type="button" onClick={() => navigate('explore')} aria-label="GBBookings home" className="shrink-0"><GBLogo size="sm" className="sm:hidden" /><GBLogo size="md" className="hidden sm:inline-flex" /></button>
      <nav id="nav-desktop-links" aria-label="Main navigation" className="hidden shrink-0 items-center gap-0.5 text-[13px] font-bold lg:flex xl:gap-1 xl:text-sm">
        {[...links, { id: 'destinations', label: isRtl ? 'مقامات' : 'Destinations', icon: MapPin }, { id: 'offers', label: isRtl ? 'آفرز' : 'Offers', icon: Tag }].map((link) => <button type="button" key={link.id} onClick={() => navigate(link.id)} onMouseEnter={() => { if (isMegaTab(link.id)) openMega(link.id); }} onMouseLeave={leaveMega} onFocus={() => { if (isMegaTab(link.id)) openMega(link.id); }} onKeyDown={(event) => { if (event.key === 'ArrowDown' && isMegaTab(link.id)) { event.preventDefault(); openMega(link.id); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#nav-mega-menu button')?.focus()); } }} aria-expanded={isMegaTab(link.id) && activeMega === link.id && !megaClosing} aria-controls="nav-mega-menu" aria-current={currentView === link.id ? 'page' : undefined} className={'flex min-h-11 items-center gap-1 border-b-2 px-1 font-bold transition-colors xl:gap-1.5 xl:px-2 ' + (currentView === link.id || (activeMega === link.id && !megaClosing) ? 'border-[#00A651] text-[#00A651]' : 'border-transparent text-slate-800 hover:border-[#00A651] hover:text-[#00A651]')}><link.icon className="size-3.5 shrink-0 text-[#00A651] xl:size-4" />{link.label}{link.id === 'offers' && <span className="ml-0.5 rounded-md bg-[#FF3B30] px-1 py-0.5 text-[8px] font-black uppercase tracking-tight text-white shadow-sm xl:px-1.5 xl:text-[9px]">HOT</span>}</button>)}
        <div className="relative" onPointerEnter={(event) => { if (event.pointerType === 'mouse') openMore(); }} onMouseLeave={leaveMore}><button type="button" onKeyDown={(event) => { if (event.key === 'ArrowDown') { event.preventDefault(); openMore(); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#nav-more button')?.focus()); } }} aria-expanded={moreOpen} aria-controls="nav-more" onClick={() => { dismissMega(); clearTimeout(moreTimer.current); setMoreOpen(!moreOpen); setAccountOpen(false); }} className="flex min-h-11 items-center gap-1 px-1 font-bold text-slate-800 hover:text-[#00A651] xl:px-2">More<ChevronDown className="size-3.5 text-slate-500" /></button>{moreOpen && <div id="nav-more" className="absolute left-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">{extraLinks.map((link) => <button key={link.id} type="button" onClick={() => navigate(link.id)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-[#00A651]"><link.icon className="size-4 text-[#00A651]" />{link.label}</button>)}</div>}</div>
      </nav>
      <div id="nav-actions" className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 xl:gap-3">
        <button type="button" onClick={() => navigate('ai-planner')} className="hidden min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#00A651]/50 px-2.5 text-xs font-extrabold text-[#00A651] shadow-sm transition-colors hover:border-[#00A651] hover:bg-[#00A651]/5 md:flex lg:hidden xl:flex xl:px-3.5"><Sparkles className="size-3.5" />AI Planner</button>
        {!isStaff && <button type="button" onClick={() => navigate(partnerLink.view)} aria-current={currentView === partnerLink.view ? 'page' : undefined} title={partnerLink.label} className="flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#00A651] px-2.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#008E45] sm:px-3 xl:px-4"><Building2 className="size-3.5 shrink-0" /><span className="hidden sm:inline">{isPartner ? 'Partner dashboard' : 'List Property'}</span><span className="sm:hidden">Host</span></button>}
        <div className="sm:hidden">{isLoggedIn ? accountControl('mobile') : <button type="button" onClick={() => onOpenAuthModal('signin')} aria-label="Sign in" className="flex size-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"><UserRound className="size-4" /></button>}</div>
        <button type="button" aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileOpen} aria-controls="nav-mobile" onClick={() => { setMobileOpen(!mobileOpen); setAccountOpen(false); }} className="flex size-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 lg:hidden">{mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}</button>
      </div>
    </div>
    {activeMega && <NavbarMegaMenu key={activeMega} activeMegaTab={activeMega} onNavigate={navigate} onClose={dismissMega} partnerView={partnerLink.view} closing={megaClosing} onEnter={keepMegaOpen} onLeave={leaveMega} />}
    {mobileOpen && <nav id="nav-mobile" aria-label="Mobile navigation" className="border-t border-slate-100 bg-white px-4 pb-4 pt-2 lg:hidden"><div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-1">{[...links, ...extraLinks, { id: 'ai-planner', label: 'AI Planner', icon: Sparkles }].map((link) => <button key={link.id} type="button" onClick={() => navigate(link.id)} className={'min-h-11 rounded-lg px-3 text-left text-sm font-medium ' + (currentView === link.id ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-50')}>{link.label}</button>)}{!isStaff && <button type="button" onClick={() => navigate(partnerLink.view)} className="min-h-11 rounded-lg px-3 text-left text-sm font-semibold text-emerald-800">{partnerLink.label}</button>}</div>{!isLoggedIn && <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3"><button type="button" onClick={() => { setMobileOpen(false); onOpenAuthModal('signin'); }} className="min-h-11 rounded-xl border border-slate-200 text-sm font-bold text-slate-700">Sign In</button><button type="button" onClick={() => { setMobileOpen(false); onOpenAuthModal('register'); }} className="min-h-11 rounded-xl bg-[#00A651] text-sm font-bold text-white hover:bg-[#008E45]">Register</button></div>}<div className="mt-3 flex items-center gap-3 border-t border-slate-100 px-3 pt-3 text-xs text-slate-500"><span>PKR</span><label className="flex items-center gap-2"><Globe className="size-3.5" /><Select aria-label="Mobile language" value={language} onChange={(event) => requestLanguageChange(event.target.value as 'en' | 'ur')} className="min-h-9 bg-transparent"><option value="en">English</option><option value="ur">اردو</option></Select></label></div></nav>}
  </header>;
}
