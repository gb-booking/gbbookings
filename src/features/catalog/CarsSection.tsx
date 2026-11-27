import { useState } from 'react';
import { ArrowRight, Car, Check, Fuel, Gauge, MapPin, Star, User, Users } from 'lucide-react';
import { Listing, handleImageError } from '../../types';
import { useListings } from '../../shared/hooks/useListings';
import { useWishlist } from '../../shared/hooks/useWishlist';
import { useLanguage } from '../../app/LanguageContext';
import {
  CategoryGrid, DateField, LandingHero, ListingGrid, Popover, PopoverDone, PopoverField, PlaceField, SearchConsole,
  type LandingCategory, usePlaces,
} from './LandingKit';

interface CarsSectionProps {
  onSelectListing: (listing: Listing) => void;
  onTriggerSearch?: (params: any) => void;
}

const CATEGORIES: LandingCategory[] = [
  { id: 'SUV', title: '4x4 Mountain SUVs', subtitle: 'Land Cruiser and Prado for rough roads', icon: Car, bgImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40' },
  { id: 'Jeep', title: 'Mountain Jeeps', subtitle: 'Deosai, Shandur and Fairy Meadows tracks', icon: Gauge, bgImage: 'https://images.unsplash.com/photo-1606016159991-dfe4f974be5c?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-blue-500/20 text-blue-400 border-blue-400/40' },
  { id: 'Van', title: 'Executive Vans', subtitle: 'Hiace Grand Cabin for groups', icon: Users, bgImage: 'https://images.unsplash.com/photo-1520050206274-a1ae446cb3cc?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-purple-500/20 text-purple-400 border-purple-400/40' },
  { id: 'Hatchback', title: 'Budget Hatchbacks', subtitle: 'Small cars for town and paved roads', icon: Fuel, bgImage: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-amber-500/20 text-amber-400 border-amber-400/40' },
  { id: 'Sedan', title: 'Highway Sedans', subtitle: 'Civic and Corolla for the Karakoram Highway', icon: Car, bgImage: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=800&q=80', iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/40' },
];

const VEHICLE_TYPES = ['4x4 SUV', 'Prado', 'Van', 'Sedan', 'Hatchback'];

// Showcase fleet from the old catalogue (5372888^ src/data.ts INITIAL_LISTINGS,
// ids c-1..c-5). These are presentation/showcase content, NOT live inventory:
// the bookable cars are the live grid above. Tapping one searches live cars.
const SHOWCASE_FLEET = [
  {
    id: 'c-1',
    title: 'Toyota Land Cruiser V8 4x4',
    location: 'Skardu, Gilgit Baltistan',
    price: 32000,
    rating: 4.9,
    reviewsCount: 156,
    image: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1200&q=80',
    description: 'The ultimate luxury rugged 4x4 SUV, perfect for Skardu, Hunza, Deosai Plains, and any mountain terrain. Equipped with off-road suspension and climate control.',
    category: 'SUV', transmission: 'Automatic', seats: 7, fuelType: 'Diesel', withDriver: true,
  },
  {
    id: 'c-2',
    title: 'Toyota Fortuner Sigma 4',
    location: 'Skardu, Gilgit Baltistan',
    price: 18000,
    rating: 4.8,
    reviewsCount: 198,
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f974be5c?auto=format&fit=crop&w=1200&q=80',
    description: 'A powerful and popular 4x4 companion for Karakoram mountain drives, combining modern interior luxury and high terrain capability.',
    category: 'SUV', transmission: 'Automatic', seats: 7, fuelType: 'Diesel', withDriver: true,
  },
  {
    id: 'c-3',
    title: 'Toyota Hiace Grand Cabin',
    location: 'Skardu, Gilgit Baltistan',
    price: 25000,
    rating: 4.7,
    reviewsCount: 112,
    image: 'https://images.unsplash.com/photo-1520050206274-a1ae446cb3cc?auto=format&fit=crop&w=1200&q=80',
    description: 'A spacious, executive, and highly comfortable grand cabin van. Ideal for group tours, family trips, and long inter-city mountain road trips.',
    category: 'Van', transmission: 'Automatic', seats: 14, fuelType: 'Diesel', withDriver: true,
  },
  {
    id: 'c-4',
    title: 'Suzuki Cultus VXL',
    location: 'Skardu, Gilgit Baltistan',
    price: 3500,
    rating: 4.6,
    reviewsCount: 98,
    image: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
    description: 'Highly economical and compact hatchback, perfect for smooth city travel, market runs, and budget-conscious travelers.',
    category: 'Hatchback', transmission: 'Manual', seats: 4, fuelType: 'Petrol', withDriver: false,
  },
  {
    id: 'c-5',
    title: 'Honda Civic Oriel',
    location: 'Skardu, Gilgit Baltistan',
    price: 7500,
    rating: 4.5,
    reviewsCount: 98,
    image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=1200&q=80',
    description: 'A stylish, high-performing luxury sedan. Ideal for inter-city travel and smooth paved Karakoram highways with sunroof and climate control.',
    category: 'Sedan', transmission: 'Automatic', seats: 5, fuelType: 'Petrol', withDriver: false,
  },
];

export default function CarsSection({ onSelectListing, onTriggerSearch }: CarsSectionProps) {
  const places = usePlaces('car', 'car');
  const { isRtl } = useLanguage();
  const wishlist = useWishlist();

  const [pickupLocation, setPickupLocation] = useState('Skardu');
  const [pickupDate, setPickupDate] = useState('2025-05-20');
  const [returnDate, setReturnDate] = useState('2025-05-23');
  const [carType, setCarType] = useState('4x4 SUV');
  const [withChauffeur, setWithChauffeur] = useState(true);
  const [category, setCategory] = useState('All');
  const [location, setLocation] = useState('All');

  const { listings: cars, pagination } = useListings('car', '', { location: location === 'All' ? undefined : location, category: category === 'All' ? undefined : category });

  return (
    <div className="space-y-12 pb-20 text-left" id="cars-page-container">
      <div className="relative">
        <LandingHero
          id="car"
          image="https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=2000&q=80"
          alt="Toyota Land Cruiser 4x4 Mountain Drive"
          icon={Car}
          eyebrow="Your Adventure Starts Here"
          title={<>4x4 Jeeps &amp; Car Rentals in <span className="text-emerald-300">Gilgit Baltistan</span></>}
          subtitle="Land Cruisers, Prados, jeeps and vans for Deosai, Khunjerab Pass and Babusar Top"
        />
        {/* Promo card restored from 5b7dd1c^ (removed by "refactor: remove promo cards from section components"). */}
        <div className="absolute right-6 bottom-6 z-20 hidden lg:block">
          <div className="bg-gradient-to-br from-[#0B5D3E] via-[#0D6E4A] to-[#043E28] rounded-3xl p-5 border border-[#16A34A]/35 text-white shadow-2xl relative overflow-hidden flex justify-between gap-4 max-w-md ml-auto">
            <div className="flex flex-col justify-between z-10 py-1 space-y-3">
              <div>
                <span className="inline-block bg-gradient-to-r from-[#FF7D29] to-[#EA580C] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
                  4X4 FLEET SPECIAL
                </span>
                <p className="text-white/80 text-[11px] font-bold tracking-widest uppercase">DISCOUNT UP TO</p>
                <h3 className="text-4xl font-black text-white tracking-tighter leading-none mt-0.5">25% OFF</h3>
                <p className="text-white/80 text-xs font-semibold mt-1.5">on Land Cruiser weekly hires</p>
              </div>
            </div>
            <div className="relative w-36 h-32 shrink-0 rounded-2xl overflow-hidden shadow-lg border border-white/15 z-10 self-center">
              <img
                src="https://images.unsplash.com/photo-1606016159991-dfe4f974be5c?auto=format&fit=crop&w=400&q=80"
                alt="Car rental promo"
                className="w-full h-full object-cover rounded-2xl"
                referrerPolicy="no-referrer"
                onError={handleImageError}
              />
            </div>
          </div>
        </div>
      </div>

      <SearchConsole
        id="car"
        icon={Car}
        title="Find & Reserve 4x4 Vehicles"
        submitLabel={isRtl ? 'گاڑیاں تلاش کریں' : 'Search Cars'}
        onSubmit={() => onTriggerSearch?.({ type: 'car', destination: pickupLocation, dates: `${pickupDate} to ${returnDate}`, extra: { carType, withDriver: withChauffeur } })}
      >
        <PlaceField
          label="Pick-up Location"
          placeholder="Airport or city pickup"
          heading="Popular Pick-up Locations"
          value={pickupLocation}
          defaultValue="Skardu"
          options={places.options}
          onChange={setPickupLocation}
        />
        <DateField label="Pick-up Date" value={pickupDate} onChange={(date) => { setPickupDate(date); if (date > returnDate) setReturnDate(date); }} />
        <DateField label="Return Date" value={returnDate} minDate={pickupDate} onChange={setReturnDate} />
        <PopoverField label="Vehicle & Driver Option" icon={Car} span="lg:col-span-3" value={`${carType} • ${withChauffeur ? 'With Driver' : 'Self Drive'}`}>
          {(close) => (
            <Popover>
              <div>
                <p className="text-xs font-bold text-slate-800 mb-2">Vehicle type</p>
                <div className="grid grid-cols-2 gap-2">
                  {VEHICLE_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCarType(type)}
                      className={`p-2 rounded-xl text-xs font-bold text-left border ${carType === type ? 'bg-[#006F3C]/10 text-[#006F3C] border-[#006F3C]/30' : 'bg-slate-50 text-slate-700 border-slate-200'}`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="border-t border-slate-100 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Chauffeur service</p>
                  <p className="text-[10px] text-slate-500">Includes experienced local driver</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={withChauffeur}
                  aria-label="Chauffeur service"
                  onClick={() => setWithChauffeur(!withChauffeur)}
                  className={`w-12 h-6 rounded-full p-1 transition-colors ${withChauffeur ? 'bg-[#006F3C]' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white transition-transform ${withChauffeur ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
              <PopoverDone onClick={close} />
            </Popover>
          )}
        </PopoverField>
      </SearchConsole>

      <CategoryGrid
        title="Explore Vehicles by Category"
        subtitle="4x4s, jeeps, vans and sedans"
        viewAllLabel="View all Vehicles"
        categories={CATEGORIES}
        selected={category}
        onSelect={setCategory}
      />

      <ListingGrid
        filterLabel="Region"
        locations={places.chips}
        location={location}
        onLocation={setLocation}
        countText="verified vehicles"
        listings={cars}
        total={pagination?.total}
        details={(car) => {
          const specs = car.carSpecs;
          return {
            badgeIcon: Car,
            badge: specs?.category || '4x4 Vehicle',
            note: { icon: User, text: specs?.driverMode === 'both' ? 'With driver or self-drive' : specs?.withDriver ? 'With driver' : 'Self-drive' },
            chips: specs ? [
              { icon: Users, text: `${specs.seats} Seats` },
              { icon: Gauge, text: specs.transmission },
              { icon: Fuel, text: specs.fuelType },
            ] : [],
            priceLabel: 'Per day',
            unit: 'day',
            cta: 'Reserve Car',
          };
        }}
        emptyIcon={Car}
        emptyTitle="No vehicles found for this filter"
        emptyHint="Try changing your location or category selection above."
        onReset={() => { setCategory('All'); setLocation('All'); }}
        wishlist={wishlist}
        onSelectListing={onSelectListing}
      />

      {/* Premium Car Rentals — showcase fleet restored from 5372888^ data.ts.
          Showcase only: tap a vehicle to search live cars in Skardu. */}
      <section className="space-y-6 pt-4">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Premium Car Rentals
          </h3>
          <p className="text-xs sm:text-sm text-slate-500">
            The featured fleet from our catalogue — check live availability for similar vehicles in Skardu.
          </p>
        </div>

        <div className="space-y-4">
          {SHOWCASE_FLEET.map((vehicle) => (
            <article
              key={vehicle.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-emerald-500/60 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-300 group flex flex-col sm:flex-row"
            >
              <div className="relative w-full sm:w-60 md:w-72 h-44 sm:h-auto overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={vehicle.image}
                  alt={vehicle.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  onError={handleImageError}
                />
                <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#006F3C]/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                  <Car className="w-3 h-3" />
                  <span>{vehicle.category}</span>
                </span>
              </div>

              <div className="p-4 sm:p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <p className="text-slate-500 font-medium flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#006F3C] shrink-0" />
                      <span className="truncate">{vehicle.location}</span>
                    </p>
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 stroke-none" />
                      <span className="font-bold text-amber-900 text-xs">{vehicle.rating}</span>
                      <span className="text-slate-400 text-[10px]">({vehicle.reviewsCount})</span>
                    </div>
                  </div>
                  <h4 className="font-bold text-slate-900 text-base sm:text-lg group-hover:text-[#006F3C] transition-colors leading-snug">
                    {vehicle.title}
                  </h4>
                  <p className="text-slate-600 text-xs line-clamp-2 leading-relaxed">{vehicle.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {[
                    { icon: Users, text: `${vehicle.seats} Seats` },
                    { icon: Gauge, text: vehicle.transmission },
                    { icon: Fuel, text: vehicle.fuelType },
                    { icon: Check, text: vehicle.withDriver ? 'With driver' : 'Self-drive' },
                  ].map(({ icon: ChipIcon, text }) => (
                    <span key={text} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold flex items-center gap-1">
                      <ChipIcon className="w-3 h-3 text-[#006F3C] shrink-0" />
                      <span>{text}</span>
                    </span>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">Per day</p>
                    <p className="text-sm sm:text-base font-bold text-slate-900">
                      PKR {vehicle.price.toLocaleString()} <span className="text-xs font-normal text-slate-500">/ day</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerSearch?.({ type: 'car', destination: 'Skardu', dates: '', extra: { withDriver: vehicle.withDriver } })}
                    className="min-h-[42px] px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-[#006F3C] hover:bg-[#005C32] text-white text-xs font-semibold transition-all shadow-2xs group-hover:shadow-md flex items-center gap-1.5 shrink-0"
                  >
                    <span>Check live availability</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
