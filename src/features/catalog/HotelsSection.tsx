import { lazy, Suspense, useMemo, useState } from 'react';
import { ArrowRight, Bed, Building2, Heart, Hotel, Map as MapIcon, MapPin, Mountain, SlidersHorizontal, Star, Users, Waves } from 'lucide-react';
import { Listing, handleImageError } from '../../types';
import { useListings } from '../../shared/hooks/useListings';
import { useWishlist } from '../../shared/hooks/useWishlist';
import { useLanguage } from '../../app/LanguageContext';
import {
  CategoryGrid, CounterRow, DateField, LandingHero, Popover, PopoverDone, PopoverField, PlaceField, SearchConsole,
  type LandingCategory, usePlaces,
} from './LandingKit';
import Select from '../../shared/components/Select';
import type { MapPoint } from '../../shared/components/OsmMap';

const OsmMap = lazy(() => import('../../shared/components/OsmMap'));

interface HotelsSectionProps {
  onSelectListing: (listing: Listing) => void;
  onTriggerSearch?: (params: any) => void;
}

const CATEGORIES: LandingCategory[] = [
  { id: 'luxury-resorts', title: 'Luxury Resorts', subtitle: 'Full-service resorts with restaurants and valley views', icon: Hotel, bgImage: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40' },
  { id: 'lakeside-resorts', title: 'Lakeside Lodges', subtitle: 'Rooms on the lakeshore', icon: Waves, bgImage: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40' },
  { id: 'alpine-lodges', title: 'Alpine Ski Lodges', subtitle: 'Lodges high in the valleys', icon: Mountain, bgImage: 'https://images.unsplash.com/photo-1518098268026-4e43a1a009de?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-blue-500/20 text-blue-400 border-blue-400/40' },
  { id: 'heritage-hotels', title: 'Heritage Forts', subtitle: 'Rooms in restored forts and old palaces', icon: Building2, bgImage: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-amber-500/20 text-amber-400 border-amber-400/40' },
  { id: 'boutique-stays', title: 'Boutique Stays', subtitle: 'Small hotels with a handful of rooms', icon: Bed, bgImage: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-purple-500/20 text-purple-400 border-purple-400/40' },
];

type SortOption = 'recommended' | 'price-low' | 'price-high' | 'rating';
const SORT_PARAM = { recommended: 'recommended', 'price-low': 'price-asc', 'price-high': 'price-desc', rating: 'rating' } as const;

const BUDGET_BANDS = [
  { id: 'any', label: 'Any price', minPrice: undefined, maxPrice: undefined },
  { id: 'under10', label: 'Under PKR 10,000', minPrice: undefined, maxPrice: 10000 },
  { id: '10-20', label: 'PKR 10,000 – 20,000', minPrice: 10000, maxPrice: 20000 },
  { id: '20-30', label: 'PKR 20,000 – 30,000', minPrice: 20000, maxPrice: 30000 },
  { id: '30plus', label: 'PKR 30,000+', minPrice: 30000, maxPrice: undefined },
] as const;

const REVIEW_BANDS = [
  { id: 0, label: 'Any score' },
  { id: 4.5, label: 'Wonderful: 4.5+' },
  { id: 4, label: 'Very good: 4+' },
  { id: 3.5, label: 'Good: 3.5+' },
] as const;

const scoreWord = (rating: number) => rating >= 4.5 ? 'Exceptional' : rating >= 4 ? 'Very good' : rating >= 3.5 ? 'Good' : rating >= 3 ? 'Pleasant' : 'Rated';

/**
 * Restored layout: hero + search + category grid are the 5372888^ page (via the
 * shared LandingKit), the hero promo card is restored from 5b7dd1c^, and the
 * results area is the demo's Booking.com-style layout — left filter sidebar
 * (budget bands, Popular Filters with counts, Property Rating, Review Score,
 * Property Type, Room Amenities), results header with sort and map preview,
 * and horizontal listing cards — wired to the CURRENT api via useListings, so
 * every price, rating, review count and rooms-left figure is live.
 *
 * NOT in history, so not copied from it: the demo's "Genius Special Price"
 * label and 9.6/9.8 ten-point scores never appear in any commit (verified with
 * git log -S), and the old page used the same vertical grid the current page
 * had. The sidebar counts are computed from the loaded live results.
 */
export default function HotelsSection({ onSelectListing, onTriggerSearch }: HotelsSectionProps) {
  const places = usePlaces('hotel', 'hotel');
  const { isRtl } = useLanguage();
  const wishlist = useWishlist();

  // Demo search defaults from the old page (20–23 May 2025).
  const [destination, setDestination] = useState('Skardu');
  const [checkIn, setCheckIn] = useState('2025-05-20');
  const [checkOut, setCheckOut] = useState('2025-05-23');
  const [guestCount, setGuestCount] = useState(2);
  const [roomCount, setRoomCount] = useState(1);
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');

  // Results filters (sidebar).
  const [budget, setBudget] = useState<string>('any');
  const [freeCancellation, setFreeCancellation] = useState(false);
  const [breakfast, setBreakfast] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [minStars, setMinStars] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState<SortOption>('recommended');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);

  const band = BUDGET_BANDS.find((item) => item.id === budget) ?? BUDGET_BANDS[0];
  const { listings: hotels, pagination, loading } = useListings('hotel', '', {
    location: location === 'All' ? undefined : location,
    category: category === 'All' ? undefined : category,
    minPrice: band.minPrice,
    maxPrice: band.maxPrice,
    minRating: minRating || undefined,
    minStars: minStars || undefined,
    amenities: selectedAmenities.join(', ') || undefined,
    ...(breakfast ? { breakfast: 'true' as const } : {}),
    ...(freeCancellation ? { freeCancellation: 'true' as const } : {}),
    sort: SORT_PARAM[sortBy],
  });

  // Popular Filters counts, from the loaded live results.
  const amenityCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const hotel of hotels) {
      for (const amenity of hotel.hotelSpecs?.amenities ?? []) {
        counts.set(amenity, (counts.get(amenity) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [hotels]);

  const toggleAmenity = (amenity: string) =>
    setSelectedAmenities((current) => current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]);

  const resetFilters = () => {
    setBudget('any');
    setFreeCancellation(false);
    setBreakfast(false);
    setSelectedAmenities([]);
    setMinStars(0);
    setMinRating(0);
    setCategory('All');
    setLocation('All');
  };

  const mapPoints: MapPoint[] = hotels.flatMap((listing) => listing.coordinates ? [{ id: listing.id, lat: listing.coordinates.lat, lng: listing.coordinates.lng, title: listing.title, label: `PKR ${listing.price.toLocaleString()}`, onSelect: () => onSelectListing(listing) }] : []);

  const checkboxRow = (checked: boolean, onChange: () => void, label: string, count?: number) => (
    <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-4 accent-[#006F3C]" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs font-semibold text-slate-400">{count}</span>}
    </label>
  );

  return (
    <div className="space-y-12 pb-20 text-left" id="hotels-page-container">
      <div className="relative">
        <LandingHero
          id="hotel"
          image="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=80"
          alt="Luxury Resort in Hunza Valley"
          icon={Building2}
          eyebrow="World-Class Alpine Hospitality"
          title={<>Luxury Hotels &amp; Resorts in <span className="text-emerald-300">Gilgit Baltistan</span></>}
          subtitle="Lake resorts, valley lodges and fort hotels. Compare rooms and book online, or pay on arrival where the hotel offers it"
        />
        {/* Promo card restored from 5b7dd1c^ (removed by "refactor: remove promo cards from section components").
            History wording is HOTEL SEASON PROMO / SAVE UP TO 30% OFF / on lakeside luxury suites —
            NOT the demo's "Book Hotels, Save More!" banner, which was never in history. */}
        <div className="absolute right-6 bottom-6 z-20 hidden lg:block">
          <div className="bg-gradient-to-br from-[#0B5D3E] via-[#0D6E4A] to-[#043E28] rounded-3xl p-5 border border-[#16A34A]/35 text-white shadow-2xl relative overflow-hidden flex justify-between gap-4 max-w-md ml-auto">
            <div className="flex flex-col justify-between z-10 py-1 space-y-3">
              <div>
                <span className="inline-block bg-gradient-to-r from-[#FF7D29] to-[#EA580C] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
                  HOTEL SEASON PROMO
                </span>
                <p className="text-white/80 text-[11px] font-bold tracking-widest uppercase">SAVE UP TO</p>
                <h3 className="text-4xl font-black text-white tracking-tighter leading-none mt-0.5">30% OFF</h3>
                <p className="text-white/80 text-xs font-semibold mt-1.5">on lakeside luxury suites</p>
              </div>
            </div>
            <div className="relative w-36 h-32 shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/15 z-10 self-center">
              <img
                src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80"
                alt="Hotel promo"
                className="w-full h-full object-cover rounded-2xl"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            </div>
          </div>
        </div>
      </div>

      <SearchConsole
        id="hotel"
        icon={Building2}
        title="Search Luxury Hotels & Resorts"
        submitLabel={isRtl ? 'ہوٹل تلاش کریں' : 'Search Hotels'}
        onSubmit={() => onTriggerSearch?.({ type: 'hotel', destination, dates: `${checkIn} to ${checkOut}`, guests: guestCount })}
      >
        <PlaceField
          label={isRtl ? 'کہاں جانا چاہتے ہیں؟' : 'Where are you staying?'}
          placeholder="Search city, lake or valley"
          heading="Popular Hotel Locations"
          value={destination}
          defaultValue="Skardu"
          options={places.options}
          onChange={setDestination}
        />
        <DateField label="Check-in Date" value={checkIn} onChange={(date) => { setCheckIn(date); if (date > checkOut) setCheckOut(date); }} />
        <DateField label="Check-out Date" value={checkOut} minDate={checkIn} onChange={setCheckOut} />
        <PopoverField label="Guests & Rooms" icon={Users} span="lg:col-span-3" value={`${guestCount} Guest${guestCount > 1 ? 's' : ''}, ${roomCount} Room${roomCount > 1 ? 's' : ''}`}>
          {(close) => (
            <Popover>
              <CounterRow label="Guests" hint="Adults & Children" value={guestCount} min={1} max={20} onChange={setGuestCount} />
              <CounterRow label="Rooms" hint="Suites / Rooms" value={roomCount} min={1} max={10} onChange={setRoomCount} divided />
              <PopoverDone onClick={close} />
            </Popover>
          )}
        </PopoverField>
      </SearchConsole>

      <CategoryGrid
        title="Explore Hotels by Category"
        subtitle="Resorts, lake lodges and fort hotels"
        viewAllLabel="View all Hotels"
        categories={CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      {/* Results: filter sidebar + header with sort and map preview + horizontal cards */}
      <section className="space-y-4 pt-4" id="hotels-results">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {location === 'All' ? 'Hotels in Gilgit Baltistan' : `Hotels in ${location}`}
            </h3>
            <p className="text-xs text-slate-500">
              {loading && hotels.length === 0 ? 'Loading…' : `${pagination?.total ?? hotels.length} ${((pagination?.total ?? hotels.length) === 1 ? 'property' : 'properties')} found`}
              {category !== 'All' && ` · ${category}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Show results as" className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs font-bold">
              {(['list', 'map'] as const).map((option) => (
                <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 capitalize ${view === option ? 'bg-[#006F3C] text-white' : 'text-slate-700 hover:bg-slate-50'}`}>
                  {option === 'map' && <MapIcon className="h-3.5 w-3.5" />}{option}
                </button>
              ))}
            </div>
            <Select aria-label="Sort results" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)} className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700">
              <option value="recommended">Sort: Recommended</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
              <option value="rating">Highest rated</option>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <button onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} className="lg:hidden flex items-center justify-center gap-2 min-h-10 rounded-lg border border-slate-300 bg-white text-sm font-semibold text-slate-700">
            <SlidersHorizontal className="h-4 w-4" /> {showFilters ? 'Hide filters' : 'Filters'}
          </button>

          <aside className={`${showFilters ? 'block' : 'hidden'} lg:block h-fit space-y-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs`}>
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><SlidersHorizontal className="h-4 w-4" /> Filters</h2>
              <button onClick={resetFilters} className="text-xs font-bold text-[#006F3C]">Reset</button>
            </div>

            <fieldset className="space-y-1">
              <legend className="text-xs font-bold text-slate-600">Your budget (per night)</legend>
              {BUDGET_BANDS.map((item) => (
                <label key={item.id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="hotel-budget" checked={budget === item.id} onChange={() => setBudget(item.id)} className="size-4 accent-[#006F3C]" />
                  {item.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-1 border-t border-slate-100 pt-4">
              <legend className="text-xs font-bold text-slate-600">Popular Filters</legend>
              {checkboxRow(freeCancellation, () => setFreeCancellation(!freeCancellation), 'Free cancellation')}
              {checkboxRow(breakfast, () => setBreakfast(!breakfast), 'Breakfast included')}
              {amenityCounts.map(([amenity, count]) => checkboxRow(selectedAmenities.includes(amenity), () => toggleAmenity(amenity), amenity, count))}
              {amenityCounts.length === 0 && <p className="text-xs text-slate-400">No amenity data in these results yet.</p>}
            </fieldset>

            <fieldset className="space-y-1 border-t border-slate-100 pt-4">
              <legend className="text-xs font-bold text-slate-600">Property Rating</legend>
              {[0, 5, 4, 3].map((stars) => (
                <label key={stars} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="hotel-stars" checked={minStars === stars} onChange={() => setMinStars(stars)} className="size-4 accent-[#006F3C]" />
                  {stars === 0 ? 'Any rating' : <span><span aria-hidden="true" className="text-amber-500">{'★'.repeat(stars)}</span> {stars}-star{stars < 5 ? ' and up' : ''}</span>}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-1 border-t border-slate-100 pt-4">
              <legend className="text-xs font-bold text-slate-600">Review Score</legend>
              {REVIEW_BANDS.map((item) => (
                <label key={item.id} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="hotel-review" checked={minRating === item.id} onChange={() => setMinRating(item.id)} className="size-4 accent-[#006F3C]" />
                  {item.label}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-1 border-t border-slate-100 pt-4">
              <legend className="text-xs font-bold text-slate-600">Property Type</legend>
              {['All', ...CATEGORIES.map((cat) => cat.title)].map((item) => (
                <label key={item} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input type="radio" name="hotel-type" checked={category === item} onChange={() => setCategory(item)} className="size-4 accent-[#006F3C]" />
                  {item}
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-1 border-t border-slate-100 pt-4">
              <legend className="text-xs font-bold text-slate-600">Room Amenities</legend>
              {amenityCounts.map(([amenity, count]) => checkboxRow(selectedAmenities.includes(amenity), () => toggleAmenity(amenity), amenity, count))}
              {amenityCounts.length === 0 && <p className="text-xs text-slate-400">No amenity data in these results yet.</p>}
              <p className="pt-1 text-[11px] leading-relaxed text-slate-400">Ticked amenities must all be offered by the property.</p>
            </fieldset>

            <div className="border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-600">Location</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {places.chips.map((item) => (
                  <button key={item} type="button" onClick={() => setLocation(item)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${location === item ? 'bg-slate-900 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="min-w-0 space-y-4">
            {view === 'map' ? (
              <div className="space-y-2">
                {mapPoints.length > 0 ? (
                  <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-xl bg-slate-100" />}><OsmMap points={mapPoints} label="Map of hotels" className="h-[32rem]" /></Suspense>
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">None of these hotels have a map pin yet. Switch back to the list.</p>
                )}
                <p className="text-xs text-slate-500">Prices are starting prices per night. Press a price to open it.</p>
              </div>
            ) : loading && hotels.length === 0 ? (
              <div className="space-y-4">{[0, 1, 2].map((item) => <div key={item} className="h-44 animate-pulse rounded-2xl bg-slate-200" />)}</div>
            ) : hotels.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
                <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-800 text-base">No hotels found for this filter</h4>
                <p className="text-xs text-slate-500">Try changing your filters above.</p>
                <button type="button" onClick={resetFilters} className="px-4 py-2 rounded-xl bg-[#006F3C] text-white text-xs font-bold">Reset Filters</button>
              </div>
            ) : (
              <div className={`space-y-4 transition-opacity ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
                {hotels.map((hotel) => {
                  const specs = hotel.hotelSpecs;
                  const saved = wishlist.isSaved(hotel.id);
                  return (
                    <article
                      key={hotel.id}
                      onClick={() => onSelectListing(hotel)}
                      className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/60 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 group cursor-pointer flex flex-col sm:flex-row"
                    >
                      <div className="relative w-full sm:w-60 md:w-72 h-48 sm:h-auto overflow-hidden bg-slate-100 shrink-0">
                        <img
                          src={hotel.image}
                          alt={hotel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          referrerPolicy="no-referrer"
                          onError={handleImageError}
                        />
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006F3C]/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                          <Building2 className="w-3 h-3" />
                          <span>{specs?.hotelType || 'Luxury Hotel'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={(event) => { event.stopPropagation(); void wishlist.toggle(hotel.id); }}
                          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 hover:bg-white text-slate-700 hover:text-red-500 transition-colors shadow-md"
                        >
                          <Heart className={`w-4 h-4 ${saved ? 'fill-rose-500 text-rose-500' : ''}`} />
                        </button>
                        {specs?.roomsAvailable ? (
                          <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border border-white/20">
                            <Bed className="w-3 h-3 text-emerald-400" />
                            <span>{specs.roomsAvailable} Rooms Left</span>
                          </div>
                        ) : null}
                      </div>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3 min-w-0">
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-[#006F3C] transition-colors leading-snug">
                                {hotel.title}
                              </h4>
                              <p className="text-slate-500 text-xs font-medium flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3.5 h-3.5 text-[#006F3C] shrink-0" />
                                <span className="truncate">{hotel.location}</span>
                                {specs?.stars ? <span className="shrink-0 text-amber-500" aria-label={`${specs.stars} star hotel`}>{'★'.repeat(specs.stars)}</span> : null}
                              </p>
                            </div>
                            {hotel.reviewsCount > 0 ? (
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs font-bold text-slate-900">{scoreWord(hotel.rating)}</p>
                                  <p className="text-[11px] text-slate-500">{hotel.reviewsCount} review{hotel.reviewsCount === 1 ? '' : 's'}</p>
                                </div>
                                <span className="flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-[#006F3C] px-2 text-sm font-bold text-white">{hotel.rating}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-[#006F3C] shrink-0">New</span>
                            )}
                          </div>
                          <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{hotel.description}</p>
                        </div>

                        {(specs?.amenities?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {specs!.amenities.slice(0, 3).map((amenity) => (
                              <span key={amenity} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">✓ {amenity}</span>
                            ))}
                          </div>
                        )}

                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-end justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Per Night</p>
                            <p className="text-sm sm:text-base font-bold text-slate-900">
                              PKR {hotel.price.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ night</span>
                            </p>
                            <p className="text-[11px] text-slate-400">Taxes &amp; fees calculated at checkout</p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => { event.stopPropagation(); onSelectListing(hotel); }}
                            className="min-h-[42px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#006F3C] hover:bg-[#005C32] text-white text-xs font-semibold transition-all shadow-2xs group-hover:shadow-md flex items-center gap-1.5 shrink-0"
                          >
                            <span>Book Room</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
}
