import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight, BadgePercent, Building2, Calendar, CalendarCheck, Car, CheckCircle2, ChevronLeft, ChevronRight,
  Clock, Compass, Fuel, Headset, Heart, Home, Lock, Map, MapPin, Mountain, Search, ShieldCheck, Sparkles, Star,
  ThumbsUp, Users, X,
} from 'lucide-react';
import type { Listing, ListingType } from '../../types';
import { handleImageError } from '../../types';
import { api } from '../../shared/api/api';
import { CounterRow, DateField, PlaceField, Popover, PopoverDone, PopoverField } from './LandingKit';
import GBLogo from '../../shared/components/GBLogo';
import { useBodyScrollLock } from '../../shared/utils/scrollLock';

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
  { id: 'tour', label: 'Tours', icon: Mountain },
];

// Hero copy: English strings from old src/LanguageContext.tsx at 5372888^
// (hero.badge / hero.title_part1 / hero.title_part2 / hero.subtitle / hero.promo.*).
// The current LanguageContext has no t() — these are hardcoded here, as instructed.
// NOTE: the demo badge "Winter Season 2026: Snow Getaways, Heated Stays & 40% Off Deals"
// (from the task brief) differs from the old code's hero.badge,
// "Explore the Beauty of Gilgit Baltistan"; the brief's badge is used below.
const HERO_BADGE = 'Winter Season 2026: Snow Getaways, Heated Stays & 40% Off Deals';
const HERO_TITLE_1 = 'Find Your Perfect Stay,';
const HERO_TITLE_2 = 'Anywhere in';
const HERO_SUBTITLE = 'Hotels, Homestays, Cars & Tour Packages – Everything you need for an unforgettable journey.';
const PROMO_TAG = 'Limited Time Offer';
const PROMO_UPTO = 'UP TO';
const PROMO_DISCOUNT = '40% OFF';
const PROMO_ON_HOTELS = 'On Selected Hotels';

// Search trust bar, verbatim from old ExploreSection (search-console assurances).
const SEARCH_ASSURANCES = [
  { icon: ShieldCheck, title: 'Best Price Guarantee', text: 'We ensure you get the best price' },
  { icon: Calendar, title: 'Free Cancellation', text: 'Cancel up to 24 hours' },
  { icon: Sparkles, title: 'Instant Confirmation', text: 'Book & get confirmed' },
  { icon: Lock, title: 'Secure Payments', text: '100% safe & secure' },
];

// Hero trust row, verbatim from old ExploreSection.
const HERO_TRUST = [
  { icon: ShieldCheck, text: 'Best Price Guarantee' },
  { icon: Calendar, text: 'Free Cancellation' },
  { icon: Headset, text: '24/7 Support' },
  { icon: Star, text: 'Trusted Stays' },
];

// Category bento cards, verbatim from old ExploreSection (counts are showcase copy).
const CATEGORY_CARDS = [
  { view: 'hotels', title: 'Hotels', count: '1200+ Properties', subtitle: 'Find the best hotel deals & luxury stays', image: 'photo-1566073771259-6a8506099945', icon: Building2, iconColor: 'text-[#2563EB]', bg: 'bg-[#EFF6FF]', border: 'border-blue-100/80', accent: 'bg-[#2563EB]' },
  { view: 'homestays', title: 'Homestays', count: '800+ Properties', subtitle: 'Cozy stays with local hospitality', image: 'photo-1542314831-068cd1dbfeeb', icon: Home, iconColor: 'text-[#006F3C]', bg: 'bg-[#006F3C]/5', border: 'border-[#006F3C]/15', accent: 'bg-[#006F3C]' },
  { view: 'cars', title: 'Cars', count: '500+ Vehicles', subtitle: 'Wide range of cars for your journey', image: 'photo-1533473359331-0135ef1b58bf', icon: Car, iconColor: 'text-[#EA580C]', bg: 'bg-[#FFF7ED]', border: 'border-orange-100/80', accent: 'bg-[#EA580C]' },
  { view: 'tours', title: 'Tours & Packages', count: '50+ Packages', subtitle: 'Curated experiences just for you', image: 'photo-1551632811-561732d1e306', icon: Mountain, iconColor: 'text-[#7C3AED]', bg: 'bg-[#F5F3FF]', border: 'border-purple-100/80', accent: 'bg-[#7C3AED]' },
];

// Popular destinations carousel, verbatim from old ExploreSection.
// "Trending Getaways" does NOT exist in any commit — this is the old destinations
// carousel restored as-is; see the report for the heading difference.
const POPULAR_DESTINATIONS = [
  { id: 'skardu', name: 'Skardu', properties: '320+ Properties', icon: Heart, image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80', searchTerm: 'Skardu' },
  { id: 'hunza-valley', name: 'Hunza Valley', properties: '450+ Properties', icon: Users, image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=800&q=80', searchTerm: 'Hunza' },
  { id: 'deosai-plains', name: 'Deosai Plains', properties: '120+ Properties', icon: Clock, image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80', searchTerm: 'Deosai' },
  { id: 'khaplu', name: 'Khaplu', properties: '80+ Properties', icon: Building2, image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', searchTerm: 'Khaplu' },
  { id: 'basho-valley', name: 'Basho Valley', properties: '60+ Properties', icon: Mountain, image: 'https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=800&q=80', searchTerm: 'Basho' },
  { id: 'nagar-valley', name: 'Nagar Valley', properties: '75+ Properties', icon: Compass, image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80', searchTerm: 'Nagar' },
  { id: 'fairy-meadows', name: 'Fairy Meadows', properties: '65+ Properties', icon: Mountain, image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80', searchTerm: 'Fairy Meadows' },
  { id: 'naltar-valley', name: 'Naltar Valley', properties: '55+ Properties', icon: Map, image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', searchTerm: 'Naltar' },
  { id: 'attabad-lake', name: 'Attabad Lake', properties: '90+ Properties', icon: Map, image: 'https://images.unsplash.com/photo-1518098268026-4e43a1a009de?auto=format&fit=crop&w=800&q=80', searchTerm: 'Attabad' },
  { id: 'phander-valley', name: 'Phander Valley', properties: '45+ Properties', icon: Compass, image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80', searchTerm: 'Phander' },
];

// The Signature Collection in the old code was the first 3 featured listings of
// old src/data.ts (INITIAL_LISTINGS at 5372888^): Luxus Hunza, Shangrila Skardu
// and Hunza Woodside Cottage — NOT Serena Shigar Fort (no such listing exists in
// history; see report). Prices/descriptions below are verbatim from that file.
const SIGNATURE_COLLECTION = [
  {
    title: 'Luxus Hunza Resort & Spa', location: 'Attabad Lake, Hunza Valley', price: 35000, rating: 4.9, reviewsCount: 148, type: 'hotel' as const,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
    description: 'Perched directly on the edge of the mesmerizing turquoise waters of Attabad Lake, Luxus Hunza offers a breathtaking luxury experience. Watch the sunset over the Karakoram peaks from your private heated balcony, relax in our world-class infinity pool, and indulge in contemporary fusion dining featuring local Hunza ingredients.',
  },
  {
    title: 'Shangrila Resort Skardu', location: 'Lower Kachura Lake, Skardu', price: 28000, rating: 4.8, reviewsCount: 215, type: 'hotel' as const,
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    description: 'Often referred to as "Heaven on Earth", Shangrila Resort Skardu is nestled among some of the world’s highest peaks, encircling the pristine heart-shaped Lower Kachura Lake. It offers signature cottage accommodation, lush terraced fruit orchards, and boating excursions under towering granite cliffs.',
  },
  {
    title: 'Hunza Woodside Cottage', location: 'Altit, Karimabad, Hunza Valley', price: 12000, rating: 4.8, reviewsCount: 42, type: 'homestay' as const,
    image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=1200&q=80',
    description: 'An authentic wooden cottage nestled in Altit village, offering unparalleled mountain views of Ultar Sar and Ladyfinger Peak. Enjoy traditional home-cooked apricot soup and salt tea with local host Karim and his family.',
  },
];

// Featured Hotels & Resorts — hardcoded showcase array, verbatim from old ExploreSection.
// "Mountiand Lodge Resort" spelling is as in the old code.
const FEATURED_HOTELS = [
  { title: 'PC Malam Jabba', location: 'Swat Valley, KPK', rating: 4.6, reviewsCount: 145, price: 13200, badge: 'Best Seller', badgeColor: 'bg-[#FF7D29]', image: 'https://images.unsplash.com/photo-1518098268026-4e43a1a009de?auto=format&fit=crop&w=400&q=80' },
  { title: 'Serena Hotel Hunza', location: 'Hunza, Gilgit Baltistan', rating: 4.8, reviewsCount: 256, price: 18500, badge: 'Top Rated', badgeColor: 'bg-emerald-600', image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80' },
  { title: 'Gilgit Serena Hotel', location: 'Gilgit, Baltistan', rating: 4.7, reviewsCount: 198, price: 16500, badge: 'Luxury', badgeColor: 'bg-blue-600', image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=80' },
  { title: 'Pearl Continental Skardu', location: 'Skardu, Baltistan', rating: 4.7, reviewsCount: 170, price: 16800, badge: 'Popular', badgeColor: 'bg-teal-600', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80' },
  { title: 'Mountiand Lodge Resort', location: 'Skardu, Baltistan', rating: 4.4, reviewsCount: 112, price: 14000, badge: 'New', badgeColor: 'bg-orange-500', image: 'https://images.unsplash.com/photo-1542718610-a1d656d1884c?auto=format&fit=crop&w=400&q=80' },
];

// Popular Destinations grid (section 2) — verbatim from old ExploreSection.
const POPULAR_DESTINATIONS_GRID = [
  { name: 'Skardu', count: '320+ Properties', image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80' },
  { name: 'Hunza Valley', count: '450+ Properties', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
  { name: 'Deosai Plains', count: '120+ Properties', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
  { name: 'Khaplu', count: '80+ Properties', image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80' },
  { name: 'Basho Valley', count: '60+ Properties', image: 'https://images.unsplash.com/photo-1518098268026-4e43a1a009de?auto=format&fit=crop&w=400&q=80' },
];

// Trending Tour Packages — verbatim from old ExploreSection.
const TRENDING_TOURS = [
  { title: 'Hunza Valley Explorer', duration: '5 Days / 4 Nights', stops: 'Islamabad - Hunza - Attabad Lake', price: 45000, oldPrice: 56000, rating: 4.8, reviews: 156, badge: '-20% OFF', badgeColor: 'bg-[#FF7D29]', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80' },
  { title: 'Skardu Adventure Tour', duration: '6 Days / 5 Nights', stops: 'Islamabad - Skardu - Shigar - Khaplu', price: 38000, oldPrice: 45000, rating: 4.7, reviews: 128, badge: '-15% OFF', badgeColor: 'bg-emerald-600', image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&q=80' },
  { title: 'Deosai Plains Expedition', duration: '4 Days / 3 Nights', stops: 'Skardu - Deosai - Sheosar Lake', price: 32000, oldPrice: 36000, rating: 4.6, reviews: 98, badge: '-10% OFF', badgeColor: 'bg-blue-600', image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80' },
  { title: 'Naran Kaghan Escape', duration: '5 Days / 4 Nights', stops: 'Islamabad - Naran - Lake Saif ul Malook', price: 28000, oldPrice: 36000, rating: 4.6, reviews: 98, badge: 'Family Tour', badgeColor: 'bg-purple-600', image: 'https://images.unsplash.com/photo-1518098268026-4e43a1a009de?auto=format&fit=crop&w=400&q=80' },
];

// Premium Car Rentals — verbatim from old ExploreSection.
const PREMIUM_CARS = [
  { title: 'Toyota Land Cruiser', type: 'SUV', fuel: 'Diesel', seats: '7 Seats', price: 32000, rating: 4.9, reviews: 156, badge: 'Best Seller', badgeColor: 'bg-[#EA580C]', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=600&q=80' },
  { title: 'Toyota Fortuner', type: 'SUV', fuel: 'Diesel', seats: '7 Seats', price: 18000, rating: 4.8, reviews: 198, badge: 'Popular', badgeColor: 'bg-[#006F3C]', image: 'https://images.unsplash.com/photo-1606016159991-dfe4f974be5c?auto=format&fit=crop&w=600&q=80' },
  { title: 'Toyota Hiace Grand Cabin', type: 'Van', fuel: 'Diesel', seats: '14 Seats', price: 25000, rating: 4.7, reviews: 112, badge: 'Luxury', badgeColor: 'bg-[#2563EB]', image: 'https://images.unsplash.com/photo-1520050206274-a1ae446cb3cc?auto=format&fit=crop&w=600&q=80' },
  { title: 'Suzuki Cultus', type: 'Hatchback', fuel: 'Petrol', seats: '4 Seats', price: 3500, rating: 4.5, reviews: 98, badge: 'Economy', badgeColor: 'bg-[#6366F1]', image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=600&q=80' },
  { title: 'Honda Civic', type: 'Sedan', fuel: 'Petrol', seats: '5 Seats', price: 7500, rating: 4.5, reviews: 98, badge: 'Standard', badgeColor: 'bg-[#006F3C]', image: 'https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?auto=format&fit=crop&w=600&q=80' },
];

// Why Choose GBBookings.com? — verbatim from old ExploreSection.
const WHY_CHOOSE = [
  { title: 'Verified Properties', desc: 'All properties are thoroughly verified', icon: CheckCircle2, color: 'text-[#16A34A]' },
  { title: 'Best Price Guarantee', desc: 'We ensure the best price always', icon: BadgePercent, color: 'text-[#1E40AF]' },
  { title: 'Secure Payments', desc: '100% safe & secure payment gateway', icon: Lock, color: 'text-[#16A34A]' },
  { title: 'Instant Confirmation', desc: 'Book instantly & get confirmation', icon: Sparkles, color: 'text-[#EA580C]' },
  { title: 'Free Cancellation', desc: 'Cancel up to 24 hours before check-in', icon: CalendarCheck, color: 'text-[#16A34A]' },
  { title: '24/7 Customer Support', desc: "We're here to help anytime, anywhere", icon: Headset, color: 'text-[#1E40AF]' },
];

// What Our Travelers Say — the 5 initial comments, verbatim from old ExploreSection.
// (The old file also had a random-comment pool and an add-comment modal; the pool is
// not shown and the modal is omitted — see report.)
const TESTIMONIALS = [
  { id: 'c-1', name: 'Ahmed Khan', location: 'Lahore, Pakistan', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80', badge: 'Hunza Valley Hotel', rating: 5, comment: 'Amazing experience with GBBookings! The hotel in Hunza was spotless with breathtaking views of Rakaposhi Peak.', time: 'Just now', likes: 38 },
  { id: 'c-2', name: 'Sophia Martinez', location: 'London, UK', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', badge: 'Skardu Prado 4x4', rating: 5, comment: 'Rented a Prado for Skardu and Deosai Plains. Vehicle was immaculate and our local driver knew every hidden spot!', time: '12m ago', likes: 54 },
  { id: 'c-3', name: 'Zainab Malik', location: 'Islamabad, Pakistan', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&h=150&q=80', badge: 'Attabad Lake Resort', rating: 5, comment: 'Attabad Lake boat trip and resort stay booked in 2 minutes. Instant confirmation and zero surprise fees.', time: '45m ago', likes: 27 },
  { id: 'c-4', name: 'David Miller', location: 'Toronto, Canada', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80', badge: 'Nagar Valley Homestay', rating: 5, comment: 'Found a serene homestay in Nagar Valley. Host family treated us like royalty with fresh orchard fruits!', time: '2h ago', likes: 41 },
  { id: 'c-5', name: 'Elena Rostova', location: 'Berlin, Germany', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&h=150&q=80', badge: 'Fairy Meadows Trek', rating: 5, comment: 'Fairy Meadows jeep safari + trekking guide package was top-notch! Best rates guaranteed indeed.', time: '3h ago', likes: 62 },
];

// GBBookings by the Numbers — verbatim from old ExploreSection.
const NUMBERS = [
  { metric: '1200+', label: 'Properties', desc: 'Hotels, Resorts & Homestays', color: 'text-indigo-600', icon: Building2 },
  { metric: '500+', label: 'Cars', desc: 'Wide Range of Vehicles', color: 'text-emerald-700', icon: Car },
  { metric: '50+', label: 'Packages', desc: 'Curated Experiences for You', color: 'text-orange-600', icon: Compass },
  { metric: '10K+', label: 'Happy Travelers', desc: 'Trusted by Thousands of Travelers', color: 'text-purple-600', icon: Users },
];

export default function ExploreSection({ setView, setSearchFilters, onSelectListing }: ExploreSectionProps) {
  const [destinations, setDestinations] = useState<Array<{ name: string; count: number; image: string }>>([]);
  useEffect(() => { api.getTopPlaces('all', 5).then(setDestinations).catch(() => undefined); }, []);
  const [type, setType] = useState<SearchType>('hotel');
  // Demo pre-filled defaults, verbatim from the old code.
  const [destination, setDestination] = useState('Gilgit Baltistan');
  const [startDate, setStartDate] = useState('2025-05-20');
  const [endDate, setEndDate] = useState('2025-05-23');
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  // 5-second delayed promo notification (old code: reappears on refresh).
  const [showPromo, setShowPromo] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShowPromo(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  useBodyScrollLock(showPromo);

  // Summer Special Deals countdown (old code: starts 2d 14h 36m 45s, resets on expiry).
  const [timeLeft, setTimeLeft] = useState({ days: 2, hours: 14, minutes: 36, seconds: 45 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 2, hours: 14, minutes: 36, seconds: 45 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Testimonial likes (old code: tapping a card liked it; likes live in local state only).
  const [liked, setLiked] = useState<Record<string, number>>({});
  const likeComment = (id: string, base: number) => setLiked((prev) => ({ ...prev, [id]: (prev[id] ?? base) + 1 }));

  // Popular destinations carousel.
  const destCarouselRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const checkDestScroll = () => {
    const el = destCarouselRef.current;
    if (el) {
      setCanScrollLeft(el.scrollLeft > 10);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
    }
  };
  useEffect(() => {
    const el = destCarouselRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', checkDestScroll, { passive: true });
    checkDestScroll();
    return () => el.removeEventListener('scroll', checkDestScroll);
  }, []);
  const scrollDestinations = (direction: 'left' | 'right') => {
    destCarouselRef.current?.scrollBy({ left: direction === 'left' ? -280 : 280, behavior: 'smooth' });
    setTimeout(checkDestScroll, 350);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    setSearchFilters({ destination: destination || 'Gilgit Baltistan', startDate, endDate, extra: { guestCount: guests, isHomestay: type === 'homestay' } });
    window.dispatchEvent(new CustomEvent('nav-to-type', { detail: { type, destination } }));
  };
  const browseDestination = (name: string) => {
    setSearchFilters({ destination: name, startDate: '', endDate: '', extra: { guestCount: guests } });
    window.dispatchEvent(new CustomEvent('nav-to-type', { detail: { type: 'hotel', destination: name } }));
  };
  // Showcase cards are presentation copy only: their ids do not exist in the live
  // API, so (unlike the old code, which fabricated Listing objects and opened a
  // detail page that could not resolve them) they navigate to the live section.
  const browseShowcase = (view: string) => setView(view);

  const testimonialCard = (card: (typeof TESTIMONIALS)[number], key: string) => (
    <article key={key} className="w-[300px] shrink-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:border-emerald-500/50 hover:shadow-lg sm:w-[340px]">
      <div className="space-y-2.5 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {Array(card.rating).fill(0).map((_, i) => <Star key={i} className="size-3.5 fill-amber-400 text-amber-400 stroke-none" />)}
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
            <CheckCircle2 className="size-3 text-emerald-600" /><span>Verified Traveler</span>
          </span>
        </div>
        <p className="line-clamp-3 text-xs font-normal italic leading-relaxed text-slate-700 sm:text-[13px]">&ldquo;{card.comment}&rdquo;</p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="flex min-w-0 items-center gap-2.5 text-left">
          <img src={card.avatar} alt={card.name} className="size-9 shrink-0 rounded-full border border-slate-200 object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
          <div className="min-w-0">
            <h5 className="truncate text-xs font-bold text-slate-900">{card.name}</h5>
            <p className="flex items-center gap-1 truncate text-[10px] font-medium text-slate-400"><MapPin className="size-2.5 shrink-0" /><span>{card.location}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label={`Like ${card.name}'s review`} onClick={() => likeComment(card.id, card.likes)} className="flex items-center gap-1 rounded-md border border-emerald-200/60 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100">
            <ThumbsUp className="size-3" /><span>{liked[card.id] ?? card.likes}</span>
          </button>
          <span className="shrink-0 rounded-lg border border-slate-200/50 bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">{card.badge}</span>
        </div>
      </div>
    </article>
  );

  return (
    <div id="explore-section" className="space-y-12 pb-20">
      {/* 1. Hero */}
      <section id="hero-banner" className="relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl sm:rounded-3xl">
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80" alt="Karakoram Mountains Gilgit Baltistan" className="absolute inset-0 h-full w-full scale-105 object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
        <div className="absolute inset-0 bg-slate-950/45" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/65 to-slate-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/20" />
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-start gap-5 px-3.5 pb-16 pt-6 sm:px-6 sm:pb-20 sm:pt-10 md:pt-14 lg:grid-cols-12 lg:items-end lg:gap-6">
          <div className="space-y-3 text-left sm:space-y-3.5 lg:col-span-7">
            <div className="pt-0.5 sm:pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-white shadow-md backdrop-blur-md sm:px-3.5 sm:py-1.5 sm:text-xs">
                <MapPin className="size-3.5 shrink-0 text-[#00A651]" /><span className="font-medium tracking-tight">{HERO_BADGE}</span>
              </div>
            </div>
            <h1 className="text-xl font-extrabold leading-snug tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl">
              {HERO_TITLE_1} {HERO_TITLE_2} <span className="font-black text-[#00A651]">Gilgit Baltistan</span>
            </h1>
            <p className="max-w-xl text-xs font-medium leading-relaxed text-slate-100/95 drop-shadow-sm sm:text-sm">{HERO_SUBTITLE}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-white sm:gap-4 md:gap-6 sm:pt-2" id="hero-trust-factors">
              {HERO_TRUST.map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <div className="flex size-5 shrink-0 items-center justify-center rounded-full border border-[#00A651]/70 bg-[#00A651]/30 shadow-inner sm:size-6">
                    <Icon className="size-2.5 text-white sm:size-3" />
                  </div>
                  <span className="text-[10px] font-bold tracking-tight text-white sm:text-xs">{text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Right promo card (UP TO 40% OFF) */}
          <div className="hidden w-full justify-end lg:col-span-5 lg:flex lg:self-end" id="hero-promo-card">
            <div className="relative flex w-full max-w-sm items-center justify-between gap-3 overflow-hidden rounded-2xl border border-[#006F3C]/40 bg-gradient-to-br from-[#006F3C] via-[#007D44] to-[#003D21] p-3 text-white shadow-xl sm:p-3.5">
              <div className="z-10 flex flex-col justify-between space-y-1.5 py-0.5 pr-4 text-left">
                <div>
                  <span className="mb-1 inline-block rounded-full bg-gradient-to-r from-[#FF7D29] to-[#EA580C] px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">{PROMO_TAG}</span>
                  <p className="text-[9.5px] font-bold uppercase tracking-widest text-white/80">{PROMO_UPTO}</p>
                  <h3 className="mt-0.5 text-2xl font-black leading-none tracking-tighter text-white">{PROMO_DISCOUNT}</h3>
                  <p className="mt-0.5 text-[11px] font-semibold text-white/80">{PROMO_ON_HOTELS}</p>
                </div>
                <button type="button" onClick={() => setView('offers')} className="group mt-1 inline-flex min-h-8 w-fit items-center gap-1 rounded-lg border border-[#006F3C]/50 bg-[#002816]/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:scale-[1.02] hover:bg-[#006F3C] active:scale-95">
                  <span>Explore Deals</span><ChevronRight className="size-3 text-white/90 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              <div className="relative z-10 h-24 w-28 shrink-0 self-center overflow-hidden rounded-xl border border-white/15 shadow-md">
                <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80" alt="Promo alpine chalet" className="h-full w-full rounded-xl object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#003D21]/40 to-transparent" />
              </div>
              <div className="pointer-events-none absolute -bottom-6 -right-6 size-20 rounded-full bg-[#006F3C]/20 blur-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Search console */}
      <section id="search-console" className="relative z-20 -mt-12 w-full sm:-mt-14">
        <div className="overflow-visible rounded-3xl border border-slate-200 bg-white shadow-xl">
          <div className="grid grid-cols-4 rounded-t-3xl border-b border-slate-100 bg-[#FAFAFA] px-1 sm:px-6">
            {SEARCH_TYPES.map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" aria-pressed={type === id} onClick={() => setType(id)} className={`flex min-h-14 min-w-0 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-bold uppercase tracking-tight transition-colors sm:gap-2 sm:text-sm ${type === id ? 'border-[#006F3C] text-[#006F3C]' : 'border-transparent text-slate-500 hover:text-[#006F3C]'}`}>
                <Icon className="size-4 shrink-0" />{label}
              </button>
            ))}
          </div>
          <form onSubmit={submitSearch} className="bg-slate-50/50 p-4 sm:p-6">
            <div className="relative grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 lg:grid-cols-12">
              <PlaceField label="Destination" placeholder="Where are you going?" heading="Popular destinations" value={destination} defaultValue="Gilgit Baltistan" options={destinations.map((item) => ({ name: item.name, region: 'Gilgit-Baltistan', desc: `${item.count} ${item.count === 1 ? 'listing' : 'listings'}` }))} onChange={setDestination} span="md:col-span-2 lg:col-span-4" />
              <DateField label="Check-in / Start date" value={startDate} onChange={setStartDate} minDate="2025-05-01" />
              <DateField label="Check-out / End date" value={endDate} onChange={setEndDate} minDate={startDate || undefined} />
              <PopoverField label="Travelers" icon={Users} value={`${guests} ${guests === 1 ? 'Guest' : 'Guests'}, ${rooms} ${rooms === 1 ? 'Room' : 'Rooms'}`} span="lg:col-span-2">
                {(close) => (
                  <Popover>
                    <CounterRow label="Guests" hint="Number of travelers" value={guests} min={1} max={20} onChange={setGuests} />
                    <CounterRow label="Rooms" hint="Number of rooms" value={rooms} min={1} max={10} onChange={setRooms} divided />
                    <PopoverDone onClick={close} />
                  </Popover>
                )}
              </PopoverField>
              <button type="submit" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#006F3C] px-4 py-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#005C32] lg:col-span-2"><Search className="size-4 shrink-0" /><span>Search {SEARCH_TYPES.find((item) => item.id === type)?.label}</span></button>
            </div>
          </form>
          <div className="grid grid-cols-1 divide-y divide-slate-200/80 rounded-b-3xl border-t border-slate-200/80 bg-slate-50/80 p-3 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
            {SEARCH_ASSURANCES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-center gap-3 px-3 py-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#006F3C]/20 bg-[#006F3C]/10 text-[#006F3C]"><Icon className="size-5" /></span>
                <div><p className="text-[13px] font-bold text-slate-800">{title}</p><p className="mt-0.5 text-xs text-slate-500">{text}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Category bento grid */}
      <section className="space-y-4 pt-4 sm:space-y-5" id="section-categories">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4" id="category-cards-grid">
          {CATEGORY_CARDS.map(({ view, title, count, subtitle, image, icon: Icon, iconColor, bg, border, accent }) => (
            <button key={view} type="button" id={`category-${view}`} onClick={() => setView(view)} className={`group relative flex h-40 cursor-pointer items-stretch overflow-hidden rounded-2xl border ${bg} ${border} text-left shadow-sm transition-all hover:shadow-md sm:h-[165px]`}>
              <div className="z-10 flex w-[58%] shrink-0 flex-col justify-between p-4 sm:p-4">
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <Icon className={`size-5 shrink-0 stroke-[2.2] ${iconColor}`} />
                    <h3 className="whitespace-nowrap text-base font-extrabold tracking-tight text-slate-900 sm:text-[17px]">{title}</h3>
                  </div>
                  <p className="text-[12px] font-bold text-slate-800">{count}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-tight text-slate-500">{subtitle}</p>
                </div>
                <div className={`mt-2 flex size-7 items-center justify-center rounded-full ${accent} text-white shadow-sm transition-transform duration-200 group-hover:scale-110 sm:size-8`}>
                  <ArrowRight className="size-3.5 stroke-[2.5]" />
                </div>
              </div>
              <div className="absolute bottom-0 right-0 top-0 w-[46%] overflow-hidden rounded-l-[40px] rounded-r-2xl sm:rounded-l-[50px]">
                <img src={`https://images.unsplash.com/${image}?auto=format&fit=crop&w=600&q=80`} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. Popular Destinations carousel (old destinations carousel; there is no
          "Trending Getaways" heading in history — see report) */}
      <section className="space-y-4 pt-4 sm:space-y-5" id="section-popular-destinations">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Popular <span className="text-[#006F3C]">Destinations</span></h2>
            <p className="mt-1 text-sm text-slate-500">Explore the most popular places in Gilgit Baltistan</p>
          </div>
          <button type="button" onClick={() => setView('destinations')} className="min-h-11 text-sm font-bold text-[#006F3C] hover:underline">View all destinations</button>
        </div>
        <div className="relative">
          {canScrollLeft && (
            <button type="button" aria-label="Scroll destinations left" onClick={() => scrollDestinations('left')} className="absolute -left-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50 sm:-left-4">
              <ChevronLeft className="size-5" />
            </button>
          )}
          <div ref={destCarouselRef} className="flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {POPULAR_DESTINATIONS.map((dest) => {
              const DestIcon = dest.icon;
              return (
                <button key={dest.id} type="button" id={`popular-dest-card-${dest.id}`} onClick={() => browseDestination(dest.searchTerm)} className="group relative aspect-[4/5] w-56 shrink-0 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 text-left shadow-sm sm:w-64">
                  <img src={dest.image} alt={dest.name} className="h-full w-full object-cover opacity-90 transition duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                    <p className="flex items-center gap-1.5 text-[15px] font-extrabold tracking-tight drop-shadow-sm sm:text-base"><DestIcon className="size-4 shrink-0" />{dest.name}</p>
                    <p className="mt-1 text-xs font-bold text-white/80">{dest.properties}</p>
                  </div>
                </button>
              );
            })}
          </div>
          {canScrollRight && (
            <button type="button" aria-label="Scroll destinations right" onClick={() => scrollDestinations('right')} className="absolute -right-2 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-md hover:bg-slate-50 sm:-right-4">
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      </section>

      {/* 5. The Signature Collection */}
      <section className="space-y-6 pt-4" id="section-exclusives">
        <div>
          <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900">The Signature Collection</h3>
          <p className="mt-1 text-sm text-slate-500">Award-winning, highly coveted experiences and premium fleets in Gilgit Baltistan.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3" id="exclusives-grid">
          {SIGNATURE_COLLECTION.map((listing) => (
            <article key={listing.title} className="group flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md transition-all hover:border-emerald-300">
              <div className="relative aspect-[16/10] shrink-0 overflow-hidden rounded-t-2xl bg-slate-100">
                <img src={listing.image} alt={listing.title} className="h-full w-full rounded-t-2xl object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute left-3 top-3 rounded-full bg-[#006F3C] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">{listing.type === 'hotel' ? 'Hotel' : 'Homestay'}</div>
                <div className="absolute bottom-3 right-3 flex items-center rounded-lg border border-[#006F3C]/20 bg-[#006F3C]/10 px-2 py-1 text-xs font-bold text-[#006F3C] shadow-sm">
                  <Star className="mr-1 size-3 fill-[#006F3C] stroke-none" />{listing.rating}
                </div>
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-4 p-4 sm:p-5">
                <div className="space-y-2 text-left">
                  <p className="flex items-center text-xs font-bold uppercase tracking-wider text-[#006F3C]"><MapPin className="mr-1 size-3.5 shrink-0" /><span className="truncate">{listing.location}</span></p>
                  <h4 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#006F3C] sm:text-base">{listing.title}</h4>
                  <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">{listing.description}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <div className="min-w-0 text-left">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Prices starting from</span>
                    <span className="text-sm font-bold text-slate-900 sm:text-base">PKR {listing.price.toLocaleString()}</span>
                    <span className="text-[10px] text-slate-400">/{listing.type === 'hotel' ? 'night' : 'night'}</span>
                  </div>
                  <button type="button" onClick={() => browseShowcase(listing.type === 'homestay' ? 'homestays' : 'hotels')} className="flex min-h-[42px] shrink-0 cursor-pointer items-center gap-1 rounded-xl bg-[#006F3C] px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-transform hover:bg-[#005C32] active:scale-95 sm:px-4">
                    <span>View Spaces</span><ArrowRight className="size-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* SECTION 1: Featured Hotels & Resorts */}
      <section className="space-y-6 pt-6" id="section-featured-hotels">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">Featured Hotels &amp; Resorts</h3>
            <p className="mt-1 text-sm text-slate-500">Handpicked stays for an unforgettable experience</p>
          </div>
          <button type="button" id="btn-all-hotels-link" onClick={() => setView('hotels')} className="flex cursor-pointer items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 transition-colors hover:text-emerald-800">
            <span>View all Hotels</span><ArrowRight className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-5" id="featured-hotels-grid">
          {FEATURED_HOTELS.map((hotel, idx) => (
            <button key={idx} type="button" id={`featured-hotel-card-${idx}`} onClick={() => browseShowcase('hotels')} className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg">
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100">
                <img src={hotel.image} alt={hotel.title} className="h-full w-full rounded-t-2xl object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className={`absolute left-2.5 top-2.5 rounded-md px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm ${hotel.badgeColor}`}>{hotel.badge}</div>
                <span className="absolute right-2.5 top-2.5 flex size-7 items-center justify-center rounded-full border border-slate-100 bg-white/95 text-slate-500 shadow-sm"><Heart className="size-3.5 stroke-[2.5]" /></span>
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-2 p-4">
                <div className="space-y-1">
                  <h4 className="line-clamp-1 text-[14px] font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700">{hotel.title}</h4>
                  <p className="flex items-center text-[11px] text-slate-500"><MapPin className="mr-0.5 size-3 shrink-0 text-slate-400" /><span>{hotel.location}</span></p>
                  <div className="flex items-center gap-1 pt-1">
                    <Star className="size-3 fill-amber-400 stroke-none" /><span className="text-[11px] font-bold text-slate-800">{hotel.rating}</span><span className="text-[10px] text-slate-400">({hotel.reviewsCount} Reviews)</span>
                  </div>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">PKR {hotel.price.toLocaleString()}</span>
                  <span className="text-[10px] font-medium text-slate-500">/night</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 2: Popular Destinations */}
      <section className="space-y-6 pt-6" id="section-popular-destinations">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">Popular Destinations</h3>
            <p className="mt-1 text-sm text-slate-500">Explore the most popular places in Gilgit Baltistan</p>
          </div>
          <button type="button" id="btn-all-destinations-link-popular" onClick={() => setView('destinations')} className="flex cursor-pointer items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 transition-colors hover:text-emerald-800">
            <span>View all Destinations</span><ArrowRight className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5" id="popular-destinations-grid">
          {POPULAR_DESTINATIONS_GRID.map((dest, i) => (
            <button key={i} type="button" id={`popular-dest-card-${i}`} onClick={() => browseDestination(dest.name === 'Hunza Valley' ? 'Hunza' : dest.name)} className="group relative aspect-[4/5] cursor-pointer overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900 shadow-sm">
              <img src={dest.image} alt={dest.name} className="h-full w-full rounded-2xl object-cover opacity-90 transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-left">
                <p className="flex items-center text-[10px] font-extrabold uppercase tracking-widest text-emerald-400"><MapPin className="mr-0.5 size-2.5 text-emerald-400" />{dest.name}</p>
                <h4 className="mt-0.5 text-base font-black tracking-tight text-white">{dest.name}</h4>
                <span className="mt-1 block text-[10px] font-bold text-white/80">{dest.count}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 3: Trending Tour Packages */}
      <section className="space-y-6 pt-6" id="section-trending-tours">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">Trending Tour Packages</h3>
            <p className="mt-1 text-sm text-slate-500">Curated tour packages just for you</p>
          </div>
          <button type="button" id="btn-all-tours-link-trending" onClick={() => setView('tours')} className="flex cursor-pointer items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-700 transition-colors hover:text-emerald-800">
            <span>View all Packages</span><ArrowRight className="size-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4" id="trending-tours-grid">
          {TRENDING_TOURS.map((tour, idx) => (
            <button key={idx} type="button" id={`trending-tour-card-${idx}`} onClick={() => browseShowcase('tours')} className="group flex h-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:border-emerald-300 hover:shadow-lg">
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-100">
                <img src={tour.image} alt={tour.title} className="h-full w-full rounded-t-2xl object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className={`absolute left-2.5 top-2.5 rounded-md px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm ${tour.badgeColor}`}>{tour.badge}</div>
              </div>
              <div className="flex flex-1 flex-col justify-between space-y-3 p-4">
                <div className="space-y-1">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">{tour.duration}</span>
                  <h4 className="line-clamp-1 text-[14px] font-extrabold leading-snug text-slate-900 transition-colors group-hover:text-emerald-700">{tour.title}</h4>
                  <p className="line-clamp-1 flex items-center text-[11px] text-slate-500"><MapPin className="mr-0.5 size-3.5 shrink-0 text-slate-400" /><span>{tour.stops}</span></p>
                  <div className="flex items-center gap-1 pt-1">
                    <Star className="size-3 fill-amber-400 stroke-none" /><span className="text-[11px] font-bold text-slate-800">{tour.rating}</span><span className="text-[10px] text-slate-400">({tour.reviews} Reviews)</span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-black text-slate-950">PKR {tour.price.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-400 line-through">PKR {tour.oldPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 4: Premium Car Rentals */}
      <section className="space-y-6 pt-6" id="section-car-rentals">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Premium <span className="text-[#EA580C]">Car Rentals</span></h3>
            <p className="mt-0.5 text-sm text-slate-500">Reliable cars for a comfortable journey</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" id="btn-all-cars-link-premium" onClick={() => setView('cars')} className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#006F3C] transition-colors hover:text-[#005C32]">
              <span>View all Cars</span><ArrowRight className="size-3.5" />
            </button>
            <button type="button" aria-label="Scroll cars" onClick={() => document.getElementById('premium-cars-grid')?.scrollBy({ left: 300, behavior: 'smooth' })} className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#006F3C]/20 bg-white text-[#006F3C] shadow-sm transition-colors hover:bg-[#006F3C]/10">
              <ArrowRight className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-5 md:grid-cols-3 lg:grid-cols-5" id="premium-cars-grid">
          {PREMIUM_CARS.map((car, idx) => (
            <button key={idx} type="button" id={`premium-car-card-${idx}`} onClick={() => browseShowcase('cars')} className="group flex h-full cursor-pointer flex-col justify-between rounded-2xl border border-slate-200/80 bg-[#F8FAFC] p-3 text-left transition-all duration-300 hover:border-slate-300 hover:shadow-md sm:p-3.5">
              <div>
                <div className="relative mb-3 aspect-[16/10] w-full shrink-0 overflow-hidden rounded-xl bg-slate-100/80">
                  <img src={car.image} alt={car.title} className="h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105" referrerPolicy="no-referrer" onError={handleImageError} />
                  <div className={`absolute left-2.5 top-2.5 rounded-md px-2.5 py-1 text-[10px] font-bold text-white shadow-sm sm:text-[11px] ${car.badgeColor}`}>{car.badge}</div>
                </div>
                <div className="space-y-1.5 px-0.5">
                  <h4 className="line-clamp-1 text-[14px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#EA580C] sm:text-[15px]">{car.title}</h4>
                  <div className="my-1.5 flex flex-wrap items-center gap-2.5 text-[11px] font-medium text-slate-500">
                    <span className="flex shrink-0 items-center gap-1"><Car className="size-3.5 shrink-0 text-slate-400" />{car.type}</span>
                    <span className="flex shrink-0 items-center gap-1"><Fuel className="size-3.5 shrink-0 text-slate-400" />{car.fuel}</span>
                    <span className="flex shrink-0 items-center gap-1"><Users className="size-3.5 shrink-0 text-slate-400" />{car.seats}</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 space-y-1 border-t border-slate-200/60 px-0.5 pt-2.5">
                <div><span className="text-base font-extrabold text-slate-900">PKR {car.price.toLocaleString()}</span><span className="text-xs font-medium text-slate-400"> /day</span></div>
                <div className="flex items-center gap-1 text-[11px]">
                  <Star className="size-3.5 shrink-0 fill-amber-400 stroke-none text-amber-400" /><span className="font-bold text-amber-600">{car.rating}</span><span className="text-slate-400">({car.reviews} Reviews)</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* SECTION 5: Summer Special Deals! */}
      <section className="pt-6" id="section-summer-deals">
        <div className="grid grid-cols-1 items-stretch overflow-hidden rounded-3xl border border-slate-200/65 bg-[#FAFBFD] shadow-sm lg:grid-cols-12">
          <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden bg-gradient-to-r from-[#003D21] via-[#006F3C] to-[#002816] p-6 text-left text-white sm:p-8 lg:col-span-5">
            <div className="pointer-events-none absolute right-0 top-0 size-44 rounded-full bg-[#006F3C]/10 blur-2xl" />
            <div className="z-10 max-w-[260px] space-y-2 sm:max-w-xs">
              <span className="block text-[10px] font-black uppercase tracking-widest text-white/80">Limited Time Offer</span>
              <h3 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl">Summer <span className="text-[#FACC15]">Special Deals!</span></h3>
              <p className="text-xs font-medium leading-relaxed text-white/80">Grab amazing discounts on hotels, tours &amp; cars.</p>
            </div>
            <div className="z-10 flex items-center gap-1.5 pt-4" id="countdown-timer-grid">
              {[{ label: 'Days', val: timeLeft.days }, { label: 'Hours', val: timeLeft.hours }, { label: 'Minutes', val: timeLeft.minutes }, { label: 'Seconds', val: timeLeft.seconds }].map((time, tIdx) => (
                <span key={time.label} className="flex items-center gap-1.5">
                  {tIdx > 0 && <span className="text-xs font-bold text-white/40 sm:text-sm">-</span>}
                  <span className="flex min-w-[48px] flex-col items-center justify-center rounded-xl border border-white/15 bg-black/20 px-2.5 py-1.5 backdrop-blur-sm sm:min-w-[54px]">
                    <span className="block text-base font-black leading-none text-white sm:text-lg">{String(time.val).padStart(2, '0')}</span>
                    <span className="mt-1 block text-[7px] font-extrabold uppercase tracking-wider text-white/60 sm:text-[8px]">{time.label}</span>
                  </span>
                </span>
              ))}
            </div>
            <div className="absolute right-4 top-[25%] z-10 flex size-[72px] rotate-[10deg] flex-col items-center justify-center rounded-full border-2 border-dashed border-white/60 bg-[#FF7D29] shadow-lg">
              <span className="text-[7px] font-bold uppercase leading-none tracking-wider text-white/90">Up to</span>
              <span className="mt-0.5 text-lg font-black leading-none text-white">40%</span>
              <span className="text-[9px] font-bold uppercase leading-none text-white/95">OFF</span>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-6 bg-white p-6 text-left sm:p-8 lg:col-span-7 lg:flex-row">
            <div className="flex w-full flex-1 flex-col items-center justify-around gap-6 sm:flex-row sm:gap-8">
              {[
                { icon: Building2, iconColor: 'text-[#1E40AF]', label: 'on Hotels', off: '40% OFF' },
                { icon: Map, iconColor: 'text-[#16A34A]', label: 'on Tour Packages', off: '30% OFF' },
                { icon: Car, iconColor: 'text-[#EA580C]', label: 'on Car Rentals', off: '25% OFF' },
              ].map(({ icon: Icon, iconColor, label, off }) => (
                <div key={label} className="flex min-w-0 items-center gap-3.5">
                  <div className={`shrink-0 ${iconColor}`}><Icon className="size-9 stroke-[1.8]" /></div>
                  <div className="min-w-0">
                    <span className="block text-[11px] font-semibold leading-none text-slate-500">Up to</span>
                    <span className="my-0.5 block text-xl font-black leading-snug text-[#EA580C] sm:text-2xl">{off}</span>
                    <span className="block text-[12px] font-medium leading-none text-slate-600">{label}</span>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" id="btn-explore-deals" onClick={() => setView('offers')} className="flex w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0B2559] px-6 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:scale-[1.02] hover:bg-[#071a3e] active:scale-95 lg:w-auto">
              <span className="text-[13px] font-bold">Explore All Deals</span><ArrowRight className="size-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 6: Why Choose GBBookings.com? */}
      <section className="pt-6" id="section-why-choose">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm sm:rounded-3xl sm:p-7">
          <div className="mb-6 space-y-1 border-b border-slate-100 pb-6">
            <h3 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              <span>Why Choose</span><GBLogo size="sm" /><span className="font-bold text-slate-900">?</span>
            </h3>
            <p className="text-xs font-medium text-slate-500 sm:text-sm">Your satisfaction is our top priority</p>
          </div>
          <div className="grid grid-cols-2 items-start gap-y-6 divide-y divide-slate-200/80 sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6 lg:divide-x lg:gap-y-0" id="why-choose-grid">
            {WHY_CHOOSE.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div key={idx} className="group flex flex-col items-start space-y-2.5 px-3 py-1 text-left first:pl-0 last:pr-0 sm:px-4">
                  <div className={`${item.color} transition-transform duration-200 group-hover:scale-110`}><Icon className="size-7 stroke-[2]" /></div>
                  <div className="space-y-1">
                    <h5 className="text-[13px] font-bold leading-snug tracking-tight text-slate-900">{item.title}</h5>
                    <p className="text-[11px] font-normal leading-relaxed text-slate-500">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SECTION 7: What Our Travelers Say */}
      <section className="space-y-6 overflow-hidden pt-6" id="section-testimonials">
        <div className="space-y-1.5 text-left">
          <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">What Our Travelers Say</h3>
          <p className="text-xs text-slate-500 sm:text-sm">Real stories from adventurers exploring Hunza, Skardu, Gilgit &amp; beyond</p>
        </div>
        <div className="group-pause relative -mx-4 space-y-4 overflow-hidden py-2 sm:-mx-8 lg:-mx-12" id="marquee-comments-container">
          <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-16 bg-gradient-to-r from-[#FAFAFA] to-transparent sm:w-28" />
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-16 bg-gradient-to-l from-[#FAFAFA] to-transparent sm:w-28" />
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-left gap-4 pr-4 sm:gap-5 sm:pr-5">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((card, idx) => testimonialCard(card, `${card.id}-row1-${idx}`))}
            </div>
          </div>
          <div className="flex overflow-hidden">
            <div className="flex animate-marquee-right gap-4 pr-4 sm:gap-5 sm:pr-5">
              {[...TESTIMONIALS, ...TESTIMONIALS].reverse().map((card, idx) => testimonialCard(card, `${card.id}-row2-${idx}`))}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 8: GBBookings by the Numbers */}
      <section className="space-y-6 pb-4 pt-6" id="section-by-the-numbers">
        <div className="space-y-1 text-left">
          <h3 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">GBBookings by the Numbers</h3>
          <p className="text-sm text-slate-500">Trusted by travelers all around the world</p>
        </div>
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4" id="numbers-grid">
          {NUMBERS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex flex-col justify-between space-y-5 rounded-3xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition-all duration-300 hover:shadow-md sm:p-6">
                <div className="flex items-center justify-between">
                  <span className={`text-2xl font-black tracking-tight sm:text-3xl ${item.color}`}>{item.metric}</span>
                  <div className="flex size-9 items-center justify-center rounded-full border border-slate-100 bg-slate-50 text-slate-400"><Icon className="size-4 shrink-0" /></div>
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 sm:text-sm">{item.label}</h4>
                  <p className="mt-1 text-[10px] font-medium leading-normal text-slate-500 sm:text-[11px]">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5-second delayed promo modal (old code used motion/AnimatePresence;
          motion/react is not installed, so this is a plain conditional render) */}
      {showPromo && (
        <div className="fixed inset-0 z-[120] flex touch-none items-center justify-center overscroll-none p-4 sm:p-6" id="promo-modal-container">
          <div onClick={() => setShowPromo(false)} aria-label="Close offer backdrop" className="fixed inset-0 cursor-pointer touch-none overscroll-none bg-slate-950/75 backdrop-blur-md" />
          <div className="animate-pop-in relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-emerald-400/50 bg-gradient-to-br from-[#006F3C] via-[#007D44] to-[#00361A] p-4 text-white shadow-[0_25px_70px_rgba(0,111,60,0.55)] sm:p-6" id="promo-popup-modal">
            <button type="button" onClick={() => setShowPromo(false)} aria-label="Dismiss offer" className="absolute right-3 top-3 z-30 flex size-8 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/40 text-white shadow-md backdrop-blur-sm transition-all hover:bg-black/70 active:scale-90 sm:right-4 sm:top-4 sm:size-9">
              <X className="size-4 sm:size-5" />
            </button>
            <div className="flex items-center justify-between gap-3 sm:gap-5">
              <div className="z-10 flex flex-1 flex-col justify-between space-y-2.5 py-1 pr-2 text-left sm:space-y-3">
                <div>
                  <span className="mb-2 inline-block rounded-full bg-gradient-to-r from-[#FF7D29] to-[#EA580C] px-3 py-1 text-[9.5px] font-black uppercase tracking-wider text-white shadow-md sm:text-[11px]">{PROMO_TAG}</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-100 sm:text-xs">{PROMO_UPTO}</p>
                  <h3 className="mt-1 text-2xl font-black leading-none tracking-tight text-white sm:text-4xl">{PROMO_DISCOUNT}</h3>
                  <p className="mt-1 text-xs font-semibold text-emerald-100/90 sm:text-sm">{PROMO_ON_HOTELS}</p>
                </div>
                <button type="button" onClick={() => { setView('offers'); setShowPromo(false); }} className="group mt-1 inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl border border-emerald-400/40 bg-[#002816] px-4 py-2 text-xs font-bold text-white shadow-lg transition-all hover:bg-[#001f11] active:scale-95 sm:px-5 sm:py-2.5 sm:text-sm">
                  <span>Explore Deals</span><ChevronRight className="size-4 text-emerald-300 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
              <div className="relative z-10 h-28 w-28 shrink-0 self-center overflow-hidden rounded-2xl border border-white/25 shadow-2xl sm:h-36 sm:w-40">
                <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=400&q=80" alt="Promo luxury hotel resort" className="h-full w-full rounded-2xl object-cover" referrerPolicy="no-referrer" onError={handleImageError} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#00361A]/40 to-transparent" />
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-emerald-400/30 blur-2xl" />
            <div className="pointer-events-none absolute -left-10 -top-10 size-36 rounded-full bg-amber-400/20 blur-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
