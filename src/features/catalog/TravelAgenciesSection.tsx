import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, LayoutGrid, List, MapPin, MessageCircle, Search, ShieldCheck, Star, Users } from 'lucide-react';

interface TravelAgenciesSectionProps {
  onTriggerSearch: (params: { type: 'tour' | 'hotel'; destination: string; dates: string; guests: number }) => void;
  setView: (view: string) => void;
}

type PriceBand = 'Budget' | 'Mid-range' | 'Premium';

interface Agency {
  id: string;
  name: string;
  region: string;
  specialities: string[];
  priceBand: PriceBand;
  about: string;
}

/**
 * NEW page built from the demo's visible copy (Step 2 item 7 of the brief):
 * the 8 agency names, the heading, and the "Why Book Through Certified
 * Travel Agencies?" block. No agency code exists anywhere in git history
 * (checked with git log -S), and there is no agency endpoint in the current
 * api, so the list below is showcase content only — region, specialities and
 * price band are the demo's presentation labels, not live inventory. No phone
 * numbers, package counts or ratings are shown, because none were in the
 * brief or in history and inventing them would fake contact data.
 *
 * What is wired to real data: "View Packages" runs a live search for tours
 * in the agency's region, and "Inquire" points at the real Help Desk.
 * WhatsApp has no published agency number to link to, so it opens the same
 * inquiry note instead of a dead wa.me link.
 */
const AGENCIES: Agency[] = [
  { id: 'hunza-adventure-tours', name: 'Hunza Adventure Tours', region: 'Hunza Valley', specialities: ['Cultural Tours', 'Trekking'], priceBand: 'Premium', about: 'Guided Hunza valley tours — Baltit and Altit forts, Attabad Lake and the Karakoram Highway, with local Balti guides.' },
  { id: 'skardu-expeditions', name: 'Skardu Expeditions', region: 'Skardu', specialities: ['Expeditions', 'Trekking'], priceBand: 'Premium', about: 'Skardu and Deosai expeditions — Shangrila, Shigar Fort, the cold desert and high-altitude lakes, with experienced mountain guides.' },
  { id: 'gb-tours-travels', name: 'GB Tours & Travels', region: 'Gilgit', specialities: ['Valley Tours', 'Transport'], priceBand: 'Mid-range', about: 'Gilgit-Baltistan valley tours with transport included — a good first-trip option covering Gilgit, Hunza and Skardu.' },
  { id: 'karakoram-treks-tours', name: 'Karakoram Treks & Tours', region: 'Karakoram', specialities: ['Trekking', 'Mountaineering'], priceBand: 'Premium', about: 'Karakoram treks and mountaineering support — base-camp treks and guided climbs for fit, experienced travellers.' },
  { id: 'alpine-adventure-club', name: 'Alpine Adventure Club', region: 'Naltar Valley', specialities: ['Adventure', 'Skiing'], priceBand: 'Mid-range', about: 'Alpine adventure in Naltar Valley — lakes, pine forests and winter skiing, run by local adventure guides.' },
  { id: 'deosai-expeditions', name: 'Deosai Expeditions', region: 'Deosai', specialities: ['Expeditions', 'Wildlife'], priceBand: 'Budget', about: 'Deosai National Park expeditions — Sheosar Lake, wildflower plains and wildlife watching in the Land of Giants.' },
  { id: 'fairy-meadows-treks', name: 'Fairy Meadows Treks', region: 'Fairy Meadows', specialities: ['Trekking', 'Camping'], priceBand: 'Mid-range', about: 'Fairy Meadows treks and campsite stays under Nanga Parbat — the classic Raikot Bridge to meadow walk, with porters and cooks.' },
  { id: 'naltar-valley-tours', name: 'Naltar Valley Tours', region: 'Naltar Valley', specialities: ['Valley Tours', 'Lakes'], priceBand: 'Budget', about: 'Naltar Valley day tours — the chain of coloured lakes, pine forests and village walks, a short drive from Gilgit.' },
];

const BAND_ORDER: Record<PriceBand, number> = { Budget: 0, 'Mid-range': 1, Premium: 2 };

const WHY_BOOK = [
  { icon: BadgeCheck, title: 'Certified & checked', text: 'Agencies on GBBookings are listed with their documents checked, so you book with a real, traceable operator.' },
  { icon: ShieldCheck, title: 'Local knowledge', text: 'They live where you travel — road conditions, weather and permits are part of the plan, not a surprise.' },
  { icon: Users, title: 'Guides included', text: 'Treks and expeditions come with local guides, porters and drivers who know the routes.' },
  { icon: Star, title: 'One place to compare', text: 'Compare regions, specialities and price bands side by side before you ask for a quote.' },
];

export default function TravelAgenciesSection({ onTriggerSearch, setView }: TravelAgenciesSectionProps) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All regions');
  const [speciality, setSpeciality] = useState('All specialities');
  const [price, setPrice] = useState('All prices');
  const [sort, setSort] = useState('name');
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inquiryId, setInquiryId] = useState<string | null>(null);

  const regions = useMemo(() => ['All regions', ...Array.from(new Set(AGENCIES.map((agency) => agency.region)))], []);
  const specialities = useMemo(() => ['All specialities', ...Array.from(new Set(AGENCIES.flatMap((agency) => agency.specialities)))], []);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = AGENCIES.filter((agency) => {
      if (region !== 'All regions' && agency.region !== region) return false;
      if (speciality !== 'All specialities' && !agency.specialities.includes(speciality)) return false;
      if (price !== 'All prices' && agency.priceBand !== price) return false;
      if (needle && ![agency.name, agency.region, agency.about, ...agency.specialities].join(' ').toLowerCase().includes(needle)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      if (sort === 'region') return a.region.localeCompare(b.region) || a.name.localeCompare(b.name);
      if (sort === 'price-low') return BAND_ORDER[a.priceBand] - BAND_ORDER[b.priceBand] || a.name.localeCompare(b.name);
      if (sort === 'price-high') return BAND_ORDER[b.priceBand] - BAND_ORDER[a.priceBand] || a.name.localeCompare(b.name);
      return a.name.localeCompare(b.name);
    });
  }, [query, region, speciality, price, sort]);

  const select = 'min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#006F3C]';

  return (
    <div className="space-y-8 pb-20">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#006F3C]">Travel agencies</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">Discover &amp; Book with Pakistan&apos;s Top Travel Agencies</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Certified local agencies for Gilgit-Baltistan — treks, expeditions, valley tours and transport, run by people who know the mountains.</p>
      </header>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative w-full lg:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search agencies" className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#006F3C]" />
        </label>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Region" value={region} onChange={(event) => setRegion(event.target.value)} className={select}>
            {regions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Speciality" value={speciality} onChange={(event) => setSpeciality(event.target.value)} className={select}>
            {specialities.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Price" value={price} onChange={(event) => setPrice(event.target.value)} className={select}>
            {['All prices', 'Budget', 'Mid-range', 'Premium'].map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <select aria-label="Sort by" value={sort} onChange={(event) => setSort(event.target.value)} className={select}>
            <option value="name">Sort by: Name</option>
            <option value="region">Sort by: Region</option>
            <option value="price-low">Sort by: Price (low to high)</option>
            <option value="price-high">Sort by: Price (high to low)</option>
          </select>
          <div className="flex overflow-hidden rounded-lg border border-slate-300" role="group" aria-label="Layout">
            <button type="button" aria-pressed={layout === 'grid'} aria-label="Grid view" onClick={() => setLayout('grid')} className={`flex min-h-11 min-w-11 items-center justify-center px-3 ${layout === 'grid' ? 'bg-[#006F3C] text-white' : 'bg-white text-slate-600'}`}><LayoutGrid className="size-4" /></button>
            <button type="button" aria-pressed={layout === 'list'} aria-label="List view" onClick={() => setLayout('list')} className={`flex min-h-11 min-w-11 items-center justify-center px-3 ${layout === 'list' ? 'bg-[#006F3C] text-white' : 'bg-white text-slate-600'}`}><List className="size-4" /></button>
          </div>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <h2 className="font-bold text-slate-900">No agencies match those filters</h2>
          <p className="mt-1 text-sm text-slate-500">Try a different search or clear the filters.</p>
          <button type="button" onClick={() => { setQuery(''); setRegion('All regions'); setSpeciality('All specialities'); setPrice('All prices'); }} className="mt-4 text-sm font-bold text-[#006F3C] underline">Clear filters</button>
        </div>
      ) : (
        <div className={layout === 'grid' ? 'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {visible.map((agency) => (
            <article key={agency.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-950">{agency.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-[#006F3C]"><MapPin className="size-3.5" />{agency.region}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800"><BadgeCheck className="size-3.5" />Certified</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-600">{agency.about}</p>
                <div className="flex flex-wrap gap-1.5">
                  {agency.specialities.map((item) => <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">{item}</span>)}
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">{agency.priceBand}</span>
                </div>
                {expandedId === agency.id && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
                    <p className="font-bold text-slate-900">About {agency.name}</p>
                    <p className="mt-1">{agency.about}</p>
                    <p className="mt-2">Region: {agency.region} · Specialities: {agency.specialities.join(', ')} · Price band: {agency.priceBand}. Packages and availability are quoted per trip — ask on the Help Desk and we will connect you.</p>
                  </div>
                )}
                {inquiryId === agency.id && (
                  <div role="status" className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm leading-relaxed text-slate-700">
                    <p className="font-bold text-slate-900">Ask about {agency.name}</p>
                    <p className="mt-1">Agency contact details aren&apos;t published in the catalogue yet. Send us the agency name on the Help Desk and we will connect you.</p>
                    <button type="button" onClick={() => setView('support')} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#006F3C] px-4 text-sm font-bold text-white">Go to Help Desk<ArrowRight className="size-4" /></button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  <button type="button" onClick={() => { setInquiryId(inquiryId === agency.id ? null : agency.id); setExpandedId(null); }} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"><MessageCircle className="size-4 text-emerald-700" />WhatsApp</button>
                  <button type="button" onClick={() => { setInquiryId(inquiryId === agency.id ? null : agency.id); setExpandedId(null); }} className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Inquire</button>
                  <button type="button" onClick={() => onTriggerSearch({ type: 'tour', destination: agency.region, dates: '', guests: 2 })} className="inline-flex min-h-10 items-center rounded-lg bg-[#006F3C] px-3 text-xs font-bold text-white hover:bg-[#005C32]">View Packages</button>
                  <button type="button" onClick={() => { setExpandedId(expandedId === agency.id ? null : agency.id); setInquiryId(null); }} className="inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[#006F3C] hover:bg-emerald-50">{expandedId === agency.id ? 'Hide Profile' : 'Visit Profile'}<ArrowRight className="size-3.5" /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8" aria-labelledby="why-agencies">
        <h2 id="why-agencies" className="text-xl font-extrabold text-slate-950">Why Book Through Certified Travel Agencies?</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_BOOK.map(({ icon: Icon, title, text }) => (
            <div key={title} className="space-y-2">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-[#006F3C]"><Icon className="size-5" /></span>
              <h3 className="font-bold text-slate-900">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
