import { useEffect, useState, type FormEvent } from 'react';
import { Building2, Car, CheckCircle2, Headset, Home, MapPin, Mountain, Search, ShieldCheck, TentTree, Users, Wallet } from 'lucide-react';
import type { Listing, ListingType } from '../../types';
import { handleImageError } from '../../types';
import { api } from '../../shared/api/api';
import FeaturedRow from './FeaturedRow';
import { CounterRow, DateField, PlaceField, Popover, PopoverDone, PopoverField } from './LandingKit';
import GBLogo from '../../shared/components/GBLogo';

interface ExploreSectionProps {
  setView: (view: string) => void;
  setSearchFilters: (filters: {
    destination?: string;
    startDate?: string;
    endDate?: string;
    extra?: { guestCount?: number; isHomestay?: boolean };
  }) => void;
  onSelectListing: (listing: Listing) => void;
}

type SearchType = Extract<ListingType, 'hotel' | 'homestay' | 'car' | 'tour'>;
const SEARCH_TYPES: Array<{ id: SearchType; label: string; icon: typeof Home }> = [
  { id: 'hotel', label: 'Hotels', icon: Building2 },
  { id: 'homestay', label: 'Homestays', icon: Home },
  { id: 'car', label: 'Cars', icon: Car },
  { id: 'tour', label: 'Tours', icon: TentTree },
];

// Decorative category photography; inventory and destination counts remain API-backed.
const CATEGORY_CARDS = [
  { view: 'hotels', title: 'Hotels & Resorts', subtitle: 'Find your mountain escape', image: 'photo-1566073771259-6a8506099945', icon: Building2, color: 'text-blue-600', background: 'bg-blue-50', accent: 'bg-blue-600' },
  { view: 'homestays', title: 'Authentic Homestays', subtitle: 'Stay local. Feel at home.', image: 'photo-1542718610-a1d656d1884c', icon: Home, color: 'text-[#006F3C]', background: 'bg-emerald-50', accent: 'bg-[#006F3C]' },
  { view: 'cars', title: 'Car Rentals', subtitle: 'Explore at your own pace', image: 'photo-1533473359331-0135ef1b58bf', icon: Car, color: 'text-orange-600', background: 'bg-orange-50', accent: 'bg-orange-600' },
  { view: 'tours', title: 'Tours & Adventures', subtitle: 'Discover the extraordinary', image: 'photo-1464822759023-fed622ff2c3b', icon: Mountain, color: 'text-purple-600', background: 'bg-purple-50', accent: 'bg-purple-600' },
];
const ASSURANCES = [
  { icon: ShieldCheck, title: 'Local partners', text: 'Stays and experiences across the valleys' },
  { icon: CheckCircle2, title: 'Plan in one place', text: 'Hotels, homestays, cars and tours' },
  { icon: Wallet, title: 'Pay on arrival', text: 'Pay your partner when you arrive' },
  { icon: Headset, title: 'Here to help', text: 'Support for your travel plans' },
];

export default function ExploreSection({ setView, setSearchFilters, onSelectListing }: ExploreSectionProps) {
  const [destinations, setDestinations] = useState<Array<{ name: string; count: number; image: string }>>([]);
  useEffect(() => { api.getTopPlaces('all', 5).then(setDestinations).catch(() => undefined); }, []);
  const [type, setType] = useState<SearchType>('hotel');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [guests, setGuests] = useState(2);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchFilters({ destination, startDate, endDate, extra: { guestCount: guests, isHomestay: type === 'homestay' } });
    window.dispatchEvent(new CustomEvent('nav-to-type', { detail: { type, destination } }));
  };
  const browseDestination = (name: string) => {
    setSearchFilters({ destination: name, startDate: '', endDate: '', extra: { guestCount: guests } });
    window.dispatchEvent(new CustomEvent('nav-to-type', { detail: { type: 'hotel', destination: name } }));
  };

  return (
    <div id="explore-section" className="space-y-10 pb-20">
      <section id="hero-banner" className="relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl sm:rounded-3xl">
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=90" alt="Mountain landscape in northern Pakistan" className="absolute inset-0 h-full w-full scale-105 object-cover" onError={handleImageError} />
        <div className="absolute inset-0 bg-slate-950/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/60 to-slate-900/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
        <div className="relative grid min-h-[300px] items-center gap-6 px-4 pb-24 pt-8 sm:min-h-[340px] sm:px-8 sm:pt-12 lg:min-h-[360px] lg:grid-cols-12">
          <div className="space-y-3.5 text-white lg:col-span-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-900/80 px-3 py-1.5 text-xs font-medium shadow-md backdrop-blur-md"><MapPin className="size-3.5 text-[#00A651]" />Discover the beauty of Northern Pakistan</div>
            <h1 className="max-w-3xl text-2xl font-extrabold leading-snug tracking-tight drop-shadow-md sm:text-3xl lg:text-4xl">Find your next stay in <span className="font-black text-[#00A651]">Gilgit-Baltistan</span></h1>
            <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-100/95">Hotels, homestays, tours and cars from local partners. Pay now or on arrival.</p>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1 text-xs font-bold">
              {[{ icon: Mountain, text: 'Mountain escapes' }, { icon: Home, text: 'Local hospitality' }, { icon: Headset, text: 'Travel support' }].map(({ icon: Icon, text }) => <span key={text} className="flex items-center gap-1.5"><span className="flex size-6 items-center justify-center rounded-full border border-[#00A651]/60 bg-[#00A651]/25"><Icon className="size-3" /></span>{text}</span>)}
            </div>
          </div>
          <div className="hidden items-center gap-4 overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-br from-[#007D44] to-[#003D21] p-4 text-white shadow-xl lg:col-span-4 lg:flex">
            <div className="min-w-0 flex-1"><span className="rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide">Explore more</span><p className="mt-3 text-xl font-extrabold leading-tight">Your journey<br />starts here.</p><button type="button" onClick={() => setView('offers')} className="mt-3 min-h-10 rounded-lg border border-white/20 bg-[#002816]/70 px-3 text-xs font-bold transition hover:bg-[#002816]">Explore deals</button></div>
            <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80" alt="Mountain lodge" className="h-28 w-24 rounded-xl border border-white/20 object-cover" onError={handleImageError} />
          </div>
        </div>
      </section>

      <section id="search-console" className="relative z-20 w-full">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="grid grid-cols-4 rounded-t-3xl border-b border-slate-100 bg-[#FAFAFA] px-1 sm:px-6">
            {SEARCH_TYPES.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={type === id} onClick={() => setType(id)} className={`flex min-h-14 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-bold uppercase tracking-tight transition-colors sm:gap-2 sm:text-sm ${type === id ? 'border-[#006F3C] text-[#006F3C]' : 'border-transparent text-slate-500 hover:text-[#006F3C]'}`}><Icon className="size-4 shrink-0" />{label}</button>)}
          </div>
          <form onSubmit={submitSearch} className="bg-slate-50/50 p-4 sm:p-6">
            <div className="relative grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-12">
              <PlaceField label="Destination" placeholder="Where are you going?" heading="Popular destinations" value={destination} defaultValue="" options={destinations.map(item => ({ name: item.name, region: 'Gilgit-Baltistan', desc: `${item.count} ${item.count === 1 ? 'listing' : 'listings'}` }))} onChange={setDestination} span="md:col-span-2 lg:col-span-4" />
              <DateField label="Check-in / Start date" value={startDate} onChange={setStartDate} />
              <DateField label="Check-out / End date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} />
              <PopoverField label="Travelers" icon={Users} value={`${guests} ${guests === 1 ? 'guest' : 'guests'}`} span="lg:col-span-2">
                {(close) => <Popover><CounterRow label="Guests" hint="Number of travelers" value={guests} min={1} max={20} onChange={setGuests} /><PopoverDone onClick={close} /></Popover>}
              </PopoverField>
              <button type="submit" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#006F3C] px-4 py-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#005C32] lg:col-span-2"><Search className="size-4 shrink-0" /><span>Search {SEARCH_TYPES.find(item => item.id === type)?.label}</span></button>
            </div>
          </form>
          <div className="grid grid-cols-1 divide-y divide-slate-200/80 rounded-b-3xl border-t border-slate-200/80 bg-slate-50/80 p-3 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {ASSURANCES.map(({ icon: Icon, title, text }) => <div key={title} className="flex items-center gap-3 px-3 py-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#006F3C]/20 bg-[#006F3C]/10 text-[#006F3C]"><Icon className="size-5" /></span><div><p className="text-[13px] font-bold text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-500">{text}</p></div></div>)}
          </div>
        </div>
      </section>

      <section aria-label="Explore by category" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CATEGORY_CARDS.map(({ view, title, subtitle, image, icon: Icon, color, background, accent }) => <button key={view} type="button" onClick={() => setView(view)} className="group relative flex min-h-44 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="relative z-10 flex w-[62%] flex-col items-start p-4"><span className={`mb-3 flex size-10 items-center justify-center rounded-xl ${background} ${color}`}><Icon className="size-5" /></span><h2 className="text-base font-extrabold leading-tight text-slate-900">{title}</h2><p className="mt-1.5 text-xs leading-relaxed text-slate-500">{subtitle}</p><span className={`mt-3 rounded-full px-3 py-1 text-[11px] font-bold text-white ${accent}`}>Explore</span></div><div className="absolute inset-y-0 right-0 w-[48%]"><img src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=500&q=80`} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" onError={handleImageError} /><div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" /></div></button>)}
      </section>

      {destinations.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Popular <span className="text-[#006F3C]">Destinations</span></h2><p className="mt-1 text-sm text-slate-500">Explore the most popular places in Gilgit Baltistan</p></div><button type="button" onClick={() => setView('destinations')} className="min-h-11 text-sm font-bold text-[#006F3C] hover:underline">View all destinations</button></div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {destinations.map((item) => <button key={item.name} onClick={() => browseDestination(item.name)} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-900 text-left shadow-md transition-shadow hover:shadow-xl"><img src={item.image} alt={item.name} className="h-full w-full object-cover opacity-90 transition duration-500 group-hover:scale-105" onError={handleImageError} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" /><div className="absolute inset-x-0 bottom-0 p-4 text-white"><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-xs text-slate-300">{item.count} {item.count === 1 ? 'listing' : 'listings'}</p></div></button>)}
          </div>
        </section>
      )}

      {SEARCH_TYPES.map((item) => <FeaturedRow key={item.id} type={item.id} label={item.label} onBrowse={() => setView(item.id === 'hotel' ? 'hotels' : item.id === 'homestay' ? 'homestays' : item.id === 'car' ? 'cars' : 'tours')} onSelectListing={onSelectListing} />)}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-6 border-b border-slate-100 pb-5"><h2 className="flex flex-wrap items-center gap-2 text-xl font-bold text-slate-900 sm:text-2xl">Why choose <GBLogo size="sm" />?</h2><p className="mt-2 text-sm text-slate-500">Everything you need for your next trip to the mountains</p></div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-200">{ASSURANCES.map(({ icon: Icon, title, text }) => <div key={title} className="space-y-2 px-3 first:pl-0"><Icon className="size-7 text-[#006F3C]" /><h3 className="text-sm font-bold text-slate-900">{title}</h3><p className="text-sm leading-relaxed text-slate-500">{text}</p></div>)}</div>
      </section>
    </div>
  );
}
