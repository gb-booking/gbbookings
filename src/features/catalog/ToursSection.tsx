import { useState } from 'react';
import { ArrowRight, Award, Check, Clock, Compass, MapPin, Mountain, Leaf, Star, User, Users } from 'lucide-react';
import { Listing, handleImageError } from '../../types';
import { useListings } from '../../shared/hooks/useListings';
import { useWishlist } from '../../shared/hooks/useWishlist';
import { useLanguage } from '../../app/LanguageContext';
import {
  CategoryGrid, CounterRow, DateField, LandingHero, ListingGrid, Popover, PopoverDone, PopoverField, PlaceField, SearchConsole,
  type LandingCategory, usePlaces,
} from './LandingKit';

interface ToursSectionProps {
  onSelectListing: (listing: Listing) => void;
  onTriggerSearch?: (params: any) => void;
}

const CATEGORIES: LandingCategory[] = [
  { id: 'autumn-tours', title: 'Autumn Odyssey', subtitle: 'Golden poplars in late autumn', icon: Leaf, bgImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-[#FF7D29]/20 text-[#FF7D29] border-[#FF7D29]/40' },
  { id: 'deosai-safari', title: 'Deosai Safari', subtitle: 'Camping trips on the Deosai plateau', icon: Mountain, bgImage: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40' },
  { id: 'blossom-tours', title: 'Spring Blossom', subtitle: 'Apricot and cherry blossom in Hunza', icon: Compass, bgImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-pink-500/20 text-pink-400 border-pink-400/40' },
  { id: 'luxury-expeditions', title: '5-Star Expeditions', subtitle: 'Top hotels and a private 4x4', icon: Award, bgImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-amber-500/20 text-amber-400 border-amber-400/40' },
  { id: 'cultural-heritage', title: 'Heritage & Forts', subtitle: 'Baltit, Altit and Shigar forts', icon: User, bgImage: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-blue-500/20 text-blue-400 border-blue-400/40' },
];

const DURATIONS = ['3 Days / 2 Nights', '5 Days / 4 Nights', '7 Days / 6 Nights', '10 Days / 9 Nights'];

// Showcase expeditions from the old catalogue (5372888^ src/data.ts
// INITIAL_LISTINGS, ids t-1/t-2). Presentation/showcase content, NOT live
// inventory: the bookable tours are the live grid above (currently none).
// Note the brief's "6 Days Hunza Adventure / 8 Days Skardu Expedition" does
// not match history: t-1 is 7 days, "Autumn Odyssey in Hunza Valley", and
// t-2 is 6 days, "Deosai Plateau & Skardu Expedition". History values restored.
const SHOWCASE_TOURS = [
  {
    id: 't-1',
    title: 'Autumn Odyssey in Hunza Valley',
    location: 'Gilgit, Hunza, Attabad, Passu',
    price: 85000,
    rating: 4.9,
    reviewsCount: 156,
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    description: 'Witness the valleys of northern Pakistan set ablaze with golden poplars, deep orange apricots, and red cherry trees during the magical Autumn season. This all-inclusive premium tour guides you through historical forts, pristine lakes, and legendary mountain views with full accommodation, private 4x4 transport, and local guides.',
    durationDays: 7,
    maxGroupSize: 12,
    included: ['4-Star Lakeside Hotel Stay', 'Daily Buffet Breakfast & Dinner', 'Private Prado SUV with Driver', 'Historical Fort Entry Tickets', 'Lakeside Boating Trip', 'Professional Tour Guide'],
  },
  {
    id: 't-2',
    title: 'Deosai Plateau & Skardu Expedition',
    location: 'Skardu, Deosai, Cold Desert, Shigar',
    price: 95000,
    rating: 4.8,
    reviewsCount: 112,
    image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=80',
    description: 'Explore Skardu, the gateway to the mighty Karakoram giants. This premium expedition includes traversing Deosai National Park (the "Land of Giants", the world’s second-highest plateau), stargazing in the cold desert of Katpana, and staying in the historic Shigar Fort.',
    durationDays: 6,
    maxGroupSize: 10,
    included: ['Luxury Heritage Resort Stays', 'Full Board Meal Plan (Breakfast, Lunch, Dinner)', 'Dedicated 4x4 Prado Cruisers', 'Deosai National Park Permits', 'Katpana Desert Glamping Evening', 'Local Balti Culturist Guide'],
  },
];

export default function ToursSection({ onSelectListing, onTriggerSearch }: ToursSectionProps) {
  const places = usePlaces('tour', 'tour');
  const { isRtl } = useLanguage();
  const wishlist = useWishlist();

  const [region, setRegion] = useState('Hunza & Skardu');
  const [departureDate, setDepartureDate] = useState('2025-05-20');
  const [duration, setDuration] = useState('7 Days');
  const [travelers, setTravelers] = useState(2);
  // Tour styles highlight a tile only; tour listings carry no style field to filter on.
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');

  const { listings: tours, pagination } = useListings('tour', '', { location: location === 'All' ? undefined : location });

  return (
    <div className="space-y-12 pb-20 text-left" id="tours-page-container">
      <div className="relative">
        <LandingHero
          id="tour"
          image="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80"
          alt="Autumn Odyssey in Hunza Valley"
          icon={Compass}
          eyebrow="Extraordinary Journeys. Unforgettable Memories."
          title={<>Tours &amp; Expeditions in <span className="text-emerald-300">Gilgit Baltistan</span></>}
          subtitle="Packages from local operators with stays, transport and a guide. Each tour lists what it includes"
        />
        {/* Promo card restored from 5b7dd1c^ (removed by "refactor: remove promo cards from section components"). */}
        <div className="absolute right-6 bottom-6 z-20 hidden lg:block">
          <div className="bg-gradient-to-br from-[#0B5D3E] via-[#0D6E4A] to-[#043E28] rounded-3xl p-5 border border-[#16A34A]/35 text-white shadow-2xl relative overflow-hidden flex justify-between gap-4 max-w-md ml-auto">
            <div className="flex flex-col justify-between z-10 py-1 space-y-3">
              <div>
                <span className="inline-block bg-gradient-to-r from-[#FF7D29] to-[#EA580C] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
                  AUTUMN TOUR SALE
                </span>
                <p className="text-white/80 text-[11px] font-bold tracking-widest uppercase">SAVE PKR</p>
                <h3 className="text-3xl font-black text-white tracking-tighter leading-none mt-0.5">20,000 OFF</h3>
                <p className="text-white/80 text-xs font-semibold mt-1.5">on 7-Day Hunza &amp; Skardu groups</p>
              </div>
            </div>
            <div className="relative w-36 h-32 shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/15 z-10 self-center">
              <img
                src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80"
                alt="Tour package promo"
                className="w-full h-full object-cover rounded-2xl"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            </div>
          </div>
        </div>
      </div>

      <SearchConsole
        id="tour"
        icon={Compass}
        title="Search Guided Packages & Expeditions"
        submitLabel={isRtl ? 'ٹورز تلاش کریں' : 'Search Tours'}
        onSubmit={() => onTriggerSearch?.({ type: 'tour', destination: region, dates: departureDate, guests: travelers })}
      >
        <PlaceField
          label="Destination Region"
          placeholder="Search Hunza, Skardu or Deosai"
          heading="Popular Tour Expeditions"
          value={region}
          defaultValue="Hunza & Skardu"
          options={places.options}
          onChange={setRegion}
        />
        <DateField label="Departure Date" value={departureDate} onChange={setDepartureDate} />
        <PopoverField label="Tour Duration" icon={Clock} span="lg:col-span-2" value={duration}>
          {(close) => (
            <Popover width="max-w-[240px]" padded={false}>
              {DURATIONS.map((option) => (
                <div
                  key={option}
                  onClick={() => { setDuration(option); close(); }}
                  className={`p-2.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${duration === option ? 'bg-[#006F3C]/10 text-[#006F3C]' : 'hover:bg-slate-50 text-slate-700'}`}
                >
                  {option}
                </div>
              ))}
            </Popover>
          )}
        </PopoverField>
        <PopoverField label="Travelers" icon={Users} span="lg:col-span-3" value={`${travelers} Person${travelers > 1 ? 's' : ''}`}>
          {(close) => (
            <Popover>
              <CounterRow label="Total Travelers" hint="Group members & family" value={travelers} min={1} max={20} onChange={setTravelers} />
              <PopoverDone onClick={close} />
            </Popover>
          )}
        </PopoverField>
      </SearchConsole>

      <CategoryGrid
        title="Explore Tours by Season & Style"
        subtitle="Autumn colour, Deosai camping and spring blossom"
        viewAllLabel="View all Tour Packages"
        categories={CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      <ListingGrid
        filterLabel="Destination"
        locations={places.chips}
        location={location}
        onLocation={setLocation}
        countText="guided tour packages"
        listings={tours}
        total={pagination?.total}
        details={(tour) => {
          const specs = tour.tourSpecs;
          return {
            badgeIcon: Clock,
            badge: !specs?.durationDays ? 'Tour' : specs.durationDays === 1 ? 'Day trip' : `${specs.durationDays} days / ${specs.durationDays - 1} nights`,
            note: { icon: Users, text: specs?.maxGroupSize ? `Up to ${specs.maxGroupSize} people` : [specs?.category, specs?.difficulty].filter(Boolean).join(' · ') || 'Guided tour' },
            chips: (specs?.included ?? []).slice(0, 3).map((text) => ({ icon: Check, text })),
            priceLabel: 'Per adult, whole tour',
            unit: 'traveler',
            cta: 'Book Expedition',
          };
        }}
        emptyIcon={Compass}
        emptyTitle="No tour packages found for this filter"
        emptyHint="Try changing your location selection above."
        onReset={() => { setCategory('All'); setLocation('All'); }}
        wishlist={wishlist}
        onSelectListing={onSelectListing}
      />

      {/* Featured expeditions — detailed horizontal cards restored from 5b7dd1c^
          (the grid was flattened to vertical cards by the promo-removal commit).
          Showcase only: Book Expedition searches live tours for that region. */}
      <section className="space-y-6 pt-4">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Featured Expeditions
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            Our signature guided expeditions — check live availability for similar tours.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {SHOWCASE_TOURS.map((tour) => (
            <div
              key={tour.id}
              className="bg-white rounded-3xl border border-slate-200/90 hover:border-emerald-500/60 overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 group flex flex-col md:flex-row justify-between"
            >
              <div className="relative md:w-5/12 h-64 md:h-auto overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={tour.image}
                  alt={tour.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#047857]/90 backdrop-blur-md text-white text-[11px] font-extrabold shadow-md">
                    <Clock className="w-3 h-3" />
                    <span>{tour.durationDays} Days / {tour.durationDays - 1} Nights</span>
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border border-white/20">
                  <Users className="w-3 h-3 text-[#4ade80]" />
                  <span>Max Group: {tour.maxGroupSize} People</span>
                </div>
              </div>

              <div className="p-6 md:w-7/12 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-slate-500 font-medium flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#047857] shrink-0" />
                      <span className="truncate">{tour.location}</span>
                    </p>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 stroke-none" />
                      <span className="font-bold text-amber-900 text-xs">{tour.rating}</span>
                      <span className="text-slate-400 text-[10px]">({tour.reviewsCount})</span>
                    </div>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-xl group-hover:text-[#047857] transition-colors leading-snug">
                    {tour.title}
                  </h4>
                  <p className="text-slate-600 text-xs line-clamp-3 leading-relaxed">
                    {tour.description}
                  </p>
                </div>

                <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Package Highlights Included:</p>
                  <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-slate-700">
                    {tour.included.slice(0, 4).map((inc, i) => (
                      <div key={i} className="flex items-center gap-1 truncate">
                        <Check className="w-3 h-3 text-[#047857] shrink-0" />
                        <span className="truncate">{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Package Price</p>
                    <p className="text-lg font-black text-slate-900">
                      PKR {tour.price.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ traveler</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerSearch?.({ type: 'tour', destination: tour.location.split(',')[0], dates: '', guests: 2 })}
                    className="px-5 py-2.5 rounded-xl bg-[#047857] hover:bg-[#065f46] text-white text-xs font-extrabold transition-all shadow-2xs group-hover:shadow-md flex items-center gap-1.5"
                  >
                    <span>Book Expedition</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
