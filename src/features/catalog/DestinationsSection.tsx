import { useState } from 'react';
import { ArrowRight, Compass, MapPin, Search } from 'lucide-react';
import { handleImageError } from '../../types';
import { useListings } from '../../shared/hooks/useListings';
import { LandingHero } from './LandingKit';

/**
 * Restored from 5372888^ (src/components/DestinationsSection.tsx).
 * The six valley cards are the old commit's showcase data, restored exactly:
 * elevations, attractions, hotel counts and best seasons are the history values,
 * which differ from the demo's (see report). There was no promo card and no
 * "Show on Map" in history — neither is restored. The live destination guides
 * below the showcase are kept from the current page so published guides stay
 * reachable; they are live API data, not showcase copy.
 */
interface DestinationsSectionProps {
  onTriggerSearch: (params: { type: 'hotel'; destination: string; dates: string; guests: number }) => void;
  setView: (view: string) => void;
}

const DESTINATIONS = [
  {
    id: 'hunza-valley',
    name: 'Hunza Valley',
    title: 'Karimabad, Altit & Attabad Lake',
    region: 'Upper Gilgit',
    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80',
    bestTime: 'Apr - Nov (Blossom & Autumn)',
    elevation: '2,438 meters',
    topAttractions: ['Baltit & Altit Forts', 'Attabad Turquoise Lake', 'Eagles Nest Viewpoint', 'Passu Cones'],
    hotelsCount: '48 Hotels & Homestays',
    featured: true,
    description: 'World-famous for longevity, breathtaking turquoise lakes, ancient 700-year-old royal forts, and golden autumn apricot orchards under Ultar Sar.',
  },
  {
    id: 'skardu-baltistan',
    name: 'Skardu & Deosai',
    title: 'Gateway to Karakoram K2 Giants',
    region: 'Baltistan',
    image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1200&q=80',
    bestTime: 'May - Oct (Summer & Stargazing)',
    elevation: '2,228 meters',
    topAttractions: ['Shangrila Heart Lake', 'Deosai Brown Bear Plain', 'Katpana Cold Desert', 'Shigar Fort'],
    hotelsCount: '36 Luxury Resorts',
    featured: true,
    description: 'The ancient capital of Baltistan, surrounded by the world’s highest high-altitude plateau, cold sand dunes, and the pristine Lower Kachura Lake.',
  },
  {
    id: 'passu-gojal',
    name: 'Passu & Gojal',
    title: 'Majestic Cathedral Peaks & Glaciers',
    region: 'Upper Hunza',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80',
    bestTime: 'May - Oct',
    elevation: '2,800 meters',
    topAttractions: ['Passu Cathedral Cones', 'Borith Lake', 'Hussaini Suspension Bridge', 'Passu Glacier Trek'],
    hotelsCount: '22 Cozy Cabins',
    featured: true,
    description: 'Unmatched dramatic mountain landscapes facing the iconic Passu Cones. Famous for Wakhi culture, suspension bridges, and organic yak burgers.',
  },
  {
    id: 'shigar-valley',
    name: 'Shigar Valley',
    title: 'Oasis of Orchards & Royal Heritage',
    region: 'Baltistan',
    image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1200&q=80',
    bestTime: 'May - Oct',
    elevation: '2,300 meters',
    topAttractions: ['Serena Shigar Fort', 'Blind Lake', 'Organic Cherry Orchards', 'Historic Wooden Mosques'],
    hotelsCount: '15 Heritage Stays',
    featured: false,
    description: 'A serene fertile valley where lush fruit orchards flourish amidst snow-covered granite peaks. Home to 17th-century Rajas palace.',
  },
  {
    id: 'naltar-valley',
    name: 'Naltar Valley',
    title: 'Emerald Pine Forests & Satrangi Lakes',
    region: 'Gilgit',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
    bestTime: 'Jun - Sep & Winter Skiing',
    elevation: '2,898 meters',
    topAttractions: ['Satrangi (7-Color) Lake', 'Naltar Ski Slope', 'Pine Forest Trails', 'Pari Lake'],
    hotelsCount: '12 Alpine Lodges',
    featured: false,
    description: 'Renowned for its crystal-clear color-shifting alpine lakes, lush pine woods, and Pakistan’s oldest ski tournament slopes.',
  },
  {
    id: 'khaplu-ghanche',
    name: 'Khaplu & Ghanche',
    title: 'Valley of Palaces & Apricot Groves',
    region: 'Baltistan',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    bestTime: 'May - Oct',
    elevation: '2,600 meters',
    topAttractions: ['Khaplu Palace', 'Chaqchan Mosque', 'Thalle Valley', 'Sailing Valley'],
    hotelsCount: '18 Local Stays',
    featured: false,
    description: 'The easternmost valley of Baltistan offering timber-and-stone royal architecture, terraced farmland, and peaceful mountain seclusion.',
  },
];

export default function DestinationsSection({ onTriggerSearch }: DestinationsSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const { listings: guides, loading: guidesLoading } = useListings('destination', '');

  const filteredDestinations = DESTINATIONS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === 'All') return matchesSearch;
    return matchesSearch && item.region.toLowerCase().includes(selectedFilter.toLowerCase());
  });

  const openDestination = (destination: string) => {
    onTriggerSearch({ type: 'hotel', destination, dates: '', guests: 2 });
  };

  return (
    <div className="space-y-12 pb-20 text-left" id="destinations-page-container">
      <LandingHero
        id="dest"
        image="https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=2000&q=80"
        alt="Gilgit Baltistan Destinations"
        icon={Compass}
        eyebrow="Explore Heaven on Earth"
        title={<>Breathtaking Destinations in <span className="text-emerald-300">Gilgit Baltistan</span></>}
        subtitle="From the turquoise waters of Attabad Lake to the infinite plains of Deosai and ancient royal fort palaces."
      />

      {/* 2. Search & Filter Console (restored from 5372888^) */}
      <section className="-mt-12 sm:-mt-14 relative z-20 w-full" id="dest-search-console">
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-2xl p-4 sm:p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-auto flex-1 flex flex-col sm:flex-row gap-2.5 items-stretch">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search valley, fort, lake or region..."
                  className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#006F3C]"
                />
              </div>
              <button
                type="button"
                className="bg-[#006F3C] hover:bg-[#005C32] text-white font-extrabold text-xs px-5 py-3 rounded-xl transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
              >
                <Search className="w-4 h-4 stroke-[2.5]" />
                <span className="whitespace-nowrap font-extrabold text-[13px]">Search Destinations</span>
              </button>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {['All', 'Hunza', 'Baltistan', 'Gilgit'].map((reg) => (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedFilter(reg)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedFilter === reg ? 'bg-[#006F3C] text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
                >
                  {reg} Region
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Destination cards (restored from 5372888^) */}
      <section className="space-y-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-8">
          {filteredDestinations.map((dest) => (
            <div
              key={dest.id}
              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 group flex flex-col justify-between"
            >
              <div className="relative h-48 sm:h-56 md:h-60 overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={dest.image}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />

                <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                  <span className="px-2.5 sm:px-3 py-1 rounded-full bg-[#006F3C] text-white text-[10px] sm:text-[11px] font-extrabold shadow-md truncate">
                    {dest.region}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-slate-200 text-[10px] font-semibold border border-white/20 shrink-0">
                    Elev: {dest.elevation}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3.5 sm:left-4 right-3.5 sm:right-4 text-white">
                  <h3 className="text-xl sm:text-2xl font-black text-white leading-tight drop-shadow-sm break-words line-clamp-1">
                    {dest.name}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-200 font-medium truncate">{dest.title}</p>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 flex-1 flex flex-col justify-between">
                <p className="text-slate-600 text-xs leading-relaxed line-clamp-3">
                  {dest.description}
                </p>

                <div className="space-y-1.5 bg-slate-50 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Top Attractions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {dest.topAttractions.map((att, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200 text-[10px] font-bold">
                        • {att}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span className="font-bold text-[#006F3C] truncate">{dest.hotelsCount}</span>
                  <span className="font-medium text-slate-400 shrink-0 ml-2">Best: {dest.bestTime}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openDestination(dest.name)}
                    className="w-full min-h-[44px] py-2.5 sm:py-3 rounded-xl bg-[#006F3C] hover:bg-[#005C32] text-white text-xs font-extrabold transition-all shadow-2xs flex items-center justify-center gap-2"
                  >
                    <span>Search Stays in {dest.name}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredDestinations.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Compass className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-3 font-bold text-slate-900">No destinations match your search</h3>
            <p className="mt-1 text-sm text-slate-500">Try a different valley, fort, lake or region.</p>
          </div>
        )}
      </section>

      {/* Live destination guides published by the marketplace team (kept from the current page). */}
      {guides.length > 0 && (
        <section className="space-y-5 pt-2">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Published destination guides
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">Guides published by the marketplace team.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((destination) => (
              <article key={destination.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[16/10] overflow-hidden bg-slate-100"><img src={destination.image} alt={destination.title} className="h-full w-full object-cover" onError={handleImageError} /></div>
                <div className="space-y-3 p-5">
                  <p className="flex items-center gap-1 text-xs font-bold text-[#006F3C]"><MapPin className="h-3.5 w-3.5" /> {destination.location}</p>
                  <h2 className="text-lg font-bold text-slate-950">{destination.title}</h2>
                  <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">{destination.description}</p>
                  <button onClick={() => openDestination(destination.title)} className="flex min-h-10 items-center gap-2 text-sm font-bold text-[#006F3C]">View available stays <ArrowRight className="h-4 w-4" /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {guidesLoading && guides.length === 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((item) => <div key={item} className="aspect-[16/10] animate-pulse rounded-lg bg-slate-200" />)}</div>
      )}
    </div>
  );
}
