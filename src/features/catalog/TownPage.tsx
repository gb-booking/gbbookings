import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, RefreshCw } from 'lucide-react';
import type { Listing, ListingType } from '../../types';
import { handleImageError } from '../../types';
import { api } from '../../shared/api/api';
import { useListings } from '../../shared/hooks/useListings';
import ListingCard from '../../shared/components/ListingCard';
import { CardSkeleton } from '../../shared/components/SkeletonLoader';
import { townPlace } from '../../shared/utils/places';

const SECTIONS: Array<{ type: Exclude<ListingType, 'destination' | 'offer'>; title: string; noun: string }> = [
  { type: 'hotel', title: 'Hotels', noun: 'hotels' },
  { type: 'homestay', title: 'Homestays', noun: 'homestays' },
  { type: 'tour', title: 'Tours', noun: 'tours' },
  { type: 'car', title: 'Car rental', noun: 'cars' },
];

interface TownPageProps {
  town: string;
  onSelectListing: (listing: Listing) => void;
  onSeeAll: (type: ListingType, town: string) => void;
}

/** One page per town (/place/<town>), like Booking.com's city pages: what can be booked there, by kind. */
export default function TownPage({ town, onSelectListing, onSeeAll }: TownPageProps) {
  // Listings say "Karimabad, Hunza", not "Hunza Valley", so match on the town's own name.
  const place = townPlace(town);
  const [cover, setCover] = useState('');
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${town} | GBBookings`;
    return () => { document.title = previousTitle; };
  }, [town]);
  useEffect(() => {
    // Cover: the photo of the town's top listing.
    api.getListingsPage({ type: 'all', location: place, sort: 'rating', limit: 1 }).then((result) => setCover(result.data[0]?.image ?? '')).catch(() => undefined);
    api.getPlaceCounts('all', [place]).then((counts) => setCount(counts[place] ?? 0)).catch(() => setCount(null));
  }, [town, place]);

  return (
    <div className="space-y-10 pb-20">
      <header className="relative overflow-hidden rounded-xl bg-slate-900 text-white">
        {cover && <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-50" onError={handleImageError} />}
        <div className="relative px-6 py-14 sm:px-10">
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-emerald-200"><MapPin className="h-3.5 w-3.5" /> Gilgit-Baltistan</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">{town}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-100">Stays, tours and cars in {town} from verified local partners, with prices in PKR.</p>
        </div>
      </header>
      {count === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <MapPin className="mx-auto h-9 w-9 text-slate-400" />
          <h2 className="mt-3 font-bold text-slate-900">Nothing listed in {town} yet</h2>
          <p className="mt-1 text-sm text-slate-500">Partners are joining all the time. Try a nearby town in the meantime.</p>
          <button type="button" onClick={() => onSeeAll('hotel', '')} className="mt-4 inline-flex min-h-10 items-center gap-1 text-sm font-bold text-[#006F3C]">Browse all stays <ArrowRight className="h-4 w-4" /></button>
        </div>
      ) : SECTIONS.map((section) => <TownSection key={section.type} town={place} label={town} {...section} onSelectListing={onSelectListing} onSeeAll={onSeeAll} />)}
    </div>
  );
}

function TownSection({ town, label, type, title, noun, onSelectListing, onSeeAll }: (typeof SECTIONS)[number] & Omit<TownPageProps, 'town'> & { town: string; label: string }) {
  const { listings, loading, error, reload, pagination } = useListings(type, '', { location: town, limit: 4, page: 1 });
  // A town with nothing of this kind skips the section instead of showing an empty box.
  if (!loading && !error && listings.length === 0) return null;
  return (
    <section aria-labelledby={`town-${type}`} className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <h2 id={`town-${type}`} className="text-xl font-bold text-slate-950">{title} in {label}{pagination?.total ? <span className="ml-2 text-sm font-normal text-slate-500">{pagination.total}</span> : null}</h2>
        <button type="button" onClick={() => onSeeAll(type, town)} className="flex min-h-10 shrink-0 items-center gap-1 text-sm font-bold text-[#006F3C]">See all {noun} <ArrowRight className="h-4 w-4" /></button>
      </div>
      {error ? (
        <p className="text-sm text-rose-700">{error} <button type="button" onClick={() => void reload()} className="inline-flex items-center gap-1 font-bold underline"><RefreshCw className="h-3.5 w-3.5" /> Try again</button></p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading ? [0, 1, 2, 3].map((item) => <CardSkeleton key={item} />) : listings.map((listing) => <ListingCard key={listing.id} listing={listing} onSelect={() => onSelectListing(listing)} />)}
        </div>
      )}
    </section>
  );
}
