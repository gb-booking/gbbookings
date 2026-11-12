import { useState, type ReactNode } from 'react';
import { api, type LatLng, type VendorListing } from '../../shared/api/api';
import { LocationPinField } from '../../shared/components/MapPin';
import { useReasonDialog } from '../../shared/components/ReasonDialog';
import { PAYMENT_LABELS } from '../../shared/utils/stayInfo';
import { CarBasicsFields, CarTermsFields, carDraft, carInput, carProblem, DRIVER_LABELS } from './CarFields';
import PhotoManager, { toPhotoInput, type EditablePhoto } from './PhotoManager';
import RegistrationFlow, { BookingModeField, type FlowPart, type FlowStep } from './RegistrationFlow';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal outline-none focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/15';
/** As for hotels: at least five photos, checked for size and blur before upload. */
const MIN_PHOTOS = 5;

const PARTS: FlowPart[] = [
  { name: 'Car details', text: 'The basics. The car, where it is based and how guests find it.', action: 'Add car details' },
  { name: 'Price & driver', text: 'The daily rate, how many you have, the driver and what guests pay at pickup.', action: 'Add price' },
  { name: 'Photos', text: 'Show the car outside and inside so guests know what to expect.', action: 'Add photos' },
  { name: 'Final steps', text: 'Choose how bookings are confirmed before you open for bookings.', action: 'Add final details' },
];

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return <label className={`block text-sm font-semibold text-slate-700 ${wide ? 'sm:col-span-2' : ''}`}>{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}

/**
 * Add a car, one question per page with a hub between parts, like join.booking.com. One listing is one car model;
 * identical cars are its count, so they share one calendar. Nothing is saved until "Complete registration"
 * (or "Save as draft") creates the listing and its single fleet entry.
 */
export default function AddCarWizard({ onDone, onExit, registration }: {
  onDone: (listing: VendorListing, message: string) => void; onExit: () => void;
  /** A new partner: business details and documents come last, and submitting them creates and submits the car. */
  registration?: (onSubmitted: () => void) => ReactNode;
}) {
  const [car, setCar] = useState(() => carDraft());
  const [base, setBase] = useState({ title: '', location: '', description: '' });
  const [pin, setPin] = useState<LatLng>();
  const [fleet, setFleet] = useState({ dailyRate: 0, count: 1 });
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [instantBook, setInstantBook] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { askReason, dialog } = useReasonDialog();
  // Make and model first; a year on its own is not a name.
  const defaultTitle = car.make.trim() || car.model.trim() ? [car.make.trim(), car.model.trim(), car.year].filter(Boolean).join(' ') : '';
  const title = base.title.trim() || defaultTitle;

  const steps: FlowStep[] = [
    { id: 'car', part: 'Car details', title: 'Which car are you renting out?', intro: 'Guests filter by type, seats and transmission.', wide: true,
      tip: ['Several of the same car?', 'List the model once. You set how many identical cars you have on the price page, and they share one calendar.'],
      problem: carProblem(car, 'car'), content: <CarBasicsFields value={car} onChange={setCar} /> },
    { id: 'base', part: 'Car details', title: 'Where is the car based?', intro: 'The city where guests normally pick it up.',
      tip: ['What makes a good description?', 'Its condition and what it is good for, such as Deosai or Khunjerab, and the driver\'s experience.'],
      problem: base.location.trim().length < 2 ? 'Add the city the car is based in.' : base.description.trim().length < 20 ? 'Write a description of at least 20 characters.' : '',
      content: <div className="grid gap-4">
        <Field label="Base city" hint="e.g. Skardu or Gilgit."><input required maxLength={240} className={inputClass} placeholder="Skardu, Gilgit-Baltistan" value={base.location} onChange={(event) => setBase({ ...base, location: event.target.value })} /></Field>
        <Field label="Listing name" hint={`Leave empty to use "${defaultTitle || 'make model year'}".`}><input maxLength={160} className={inputClass} placeholder={defaultTitle} value={base.title} onChange={(event) => setBase({ ...base, title: event.target.value })} /></Field>
        <Field label="Description"><textarea required minLength={20} maxLength={10000} className={`${inputClass} min-h-28 py-3`} value={base.description} onChange={(event) => setBase({ ...base, description: event.target.value })} /></Field>
      </div> },
    { id: 'pin', part: 'Car details', title: 'Pin the pickup point on the map', intro: 'Guests use it to find you on the day.',
      tip: ['Is the red pin in the wrong place?', 'Tap the map where guests collect the car. Use your current location only while you are there.'],
      problem: pin ? '' : 'Drop a pin where guests pick the car up.', content: <LocationPinField value={pin} onChange={setPin} location={base.location} /> },
    { id: 'terms', part: 'Price & driver', title: 'How is it rented?', intro: 'The daily rate is for the car. A driver, trips outside the base city and one-way drop-off are added on top.', wide: true,
      tip: ['How do I get paid?', 'Pay on arrival guests pay you at pickup. Pay now money is held by GBBookings and paid out to you after the rental.'],
      problem: fleet.dailyRate <= 0 ? 'Set the price per day.' : fleet.count < 1 ? 'Set how many of these cars you have.' : carProblem(car, 'terms'),
      content: <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price per day (PKR)"><input type="number" required min={1} max={1000000} className={inputClass} value={fleet.dailyRate} onChange={(event) => setFleet({ ...fleet, dailyRate: Number(event.target.value) })} /></Field>
          <Field label="How many of this car?" hint="We never book more than you have."><input type="number" required min={1} max={500} className={inputClass} value={fleet.count} onChange={(event) => setFleet({ ...fleet, count: Number(event.target.value) })} /></Field>
        </div>
        <CarTermsFields value={car} onChange={setCar} />
      </div> },
    { id: 'photos', part: 'Photos', title: 'What does the car look like?', intro: `Upload at least ${MIN_PHOTOS} photos: outside, inside, seats and boot. The first is the cover.`,
      tip: ['What if I don\'t have professional photos?', 'A phone camera is fine. Shoot in daylight, with the car clean, and only use photos you took.'],
      problem: photos.length < MIN_PHOTOS ? `Upload at least ${MIN_PHOTOS} photos (${photos.length} so far).` : '',
      content: <PhotoManager photos={photos} onChange={setPhotos} max={20} min={MIN_PHOTOS} qualityCheck label="Car photos" onUploadingChange={setUploading} /> },
    { id: 'howwork', part: 'Final steps', title: 'How bookings work', intro: 'Some important info before you list your car on GBBookings.',
      tip: ['Can I change this later?', 'Yes. Switch between instant confirmation and request to book any time from your dashboard.'],
      problem: '', content: <BookingModeField value={instantBook} onChange={setInstantBook} noun="car" /> },
  ];

  const summary: Array<[string, string, string]> = [
    ['Car', `${title || '—'} · ${car.category} · ${car.transmission} · ${car.fuelType} · ${car.seats} seats`, 'car'],
    ['Base', `${base.location || '—'}${pin ? ' · map pin set' : ''}`, 'base'],
    ['Price', `PKR ${fleet.dailyRate.toLocaleString()} per day · ${fleet.count} car${fleet.count === 1 ? '' : 's'}`, 'terms'],
    ['Driver', `${DRIVER_LABELS[car.driverMode]}${car.driverMode !== 'self_drive' && car.driverPerDay ? ` · driver PKR ${car.driverPerDay.toLocaleString()}/day` : ''}${car.driverMode !== 'with_driver' ? ` · self-drive from age ${car.minDriverAge}, deposit PKR ${car.deposit.toLocaleString()}` : ''}`, 'terms'],
    ['Payment at pickup', car.paymentMethods.map((method) => PAYMENT_LABELS[method]).join(', ') || '—', 'terms'],
    ['Photos', `${photos.length} photo${photos.length === 1 ? '' : 's'}`, 'photos'],
    ['Bookings', instantBook ? 'Instant confirmation' : 'Request to book', 'howwork'],
  ];

  const exit = async () => {
    if ((car.make || base.description || photos.length) && await askReason({ title: 'Leave without saving?', destructive: true, confirmLabel: 'Discard car', description: 'Nothing has been saved yet. Use Save as draft on the overview to keep it.' }) === null) return;
    onExit();
  };

  const finish = async (submit: boolean) => {
    const blocking = steps.map((item) => item.problem).find(Boolean);
    if (submit && blocking) { setError(blocking); return; }
    if (!submit && (!car.make.trim() || base.description.trim().length < 20 || !photos.length || fleet.dailyRate <= 0)) {
      setError('To save a draft, add the car, its description, its price and at least one photo.');
      return;
    }
    setBusy(true); setError('');
    let created: VendorListing | null = null;
    try {
      created = (await api.createHotelListing({
        type: 'car', title, location: base.location.trim(), description: base.description.trim(), price: fleet.dailyRate,
        imageIds: photos.flatMap((photo) => (photo.mediaId ? [photo.mediaId] : [])), photos: toPhotoInput(photos),
        carSpecs: carInput(car), stayInfo: { paymentMethods: car.paymentMethods }, instantBook, ...(pin ? { coordinates: pin } : {}),
      })).data;
      // The car's single fleet entry: seats are its capacity, the count is how many identical cars there are.
      await api.addHotelRoom(created.id, {
        name: title, bedType: car.category, maxAdults: car.seats, maxChildren: 0, totalRooms: fleet.count, basePrice: fleet.dailyRate, amenities: [],
      });
      if (submit) created = (await api.submitHotelListing(created.id)).data;
      onDone(created, submit ? `${created.title} was submitted. You will get an email once GBBookings has checked it.` : `${created.title} is saved as a draft. Submit it from its Price & fleet tab when ready.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The car could not be saved.';
      if (created) onDone(created, `${created.title} was saved as a draft, but not everything went through: ${message} Finish it below.`);
      else setError(message);
    } finally { setBusy(false); }
  };

  return <>
    {dialog}
    <RegistrationFlow name={title || 'New car'} subtitle={base.location} parts={PARTS} steps={steps} summary={summary}
      busy={busy} uploading={uploading} error={error} setError={setError}
      onSaveDraft={() => void finish(false)} onSubmit={() => void finish(true)} onExit={exit}
      verification={registration?.(() => void finish(true))} />
  </>;
}
