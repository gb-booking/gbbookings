import { CalendarCheck, Gift, Heart, LifeBuoy, MessageSquare, Sparkles, UserRound, Wallet } from 'lucide-react';

/** The Customer sidebar from the Console SRS, over the guest pages. */
const ITEMS = [
  { view: 'bookings', label: 'My bookings', icon: CalendarCheck },
  { view: 'payments', label: 'Payments & refunds', icon: Wallet },
  { view: 'saved', label: 'Wishlist', icon: Heart },
  { view: 'inbox', label: 'Messages', icon: MessageSquare },
  { view: 'support', label: 'Support tickets', icon: LifeBuoy },
  { view: 'ai-planner', label: 'AI trip planner', icon: Sparkles },
  { view: 'loyalty', label: 'Loyalty', icon: Gift },
  { view: 'profile', label: 'Account settings', icon: UserRound },
] as const;

export default function AccountMenu({ current, onNavigate }: { current: string; onNavigate: (view: string) => void }) {
  return (
    <nav aria-label="My account" className="-mx-4 mb-5 overflow-x-auto px-4 lg:sticky lg:top-24 lg:mx-0 lg:mb-0 lg:w-56 lg:shrink-0 lg:self-start lg:px-0">
      <ul className="flex gap-2 lg:flex-col lg:gap-0.5">
        {ITEMS.map(({ view, label, icon: Icon }) => {
          const active = current === view;
          return <li key={view} className="shrink-0">
            <button type="button" aria-current={active ? 'page' : undefined} onClick={() => onNavigate(view)}
              className={`flex min-h-11 w-full items-center gap-2.5 whitespace-nowrap rounded-lg border px-3 text-sm font-semibold lg:border-0 ${active ? 'border-[#006F3C] bg-emerald-50 text-[#006F3C]' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
              <Icon className="size-4 shrink-0" aria-hidden="true" />{label}
            </button>
          </li>;
        })}
      </ul>
    </nav>
  );
}
