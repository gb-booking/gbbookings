import { useState, type ReactNode } from 'react';
import { api, type LatLng, type VendorListing } from '../../shared/api/api';
import { LocationPinField } from '../../shared/components/MapPin';
import { useReasonDialog } from '../../shared/components/ReasonDialog';
import { PAYMENT_LABELS } from '../../shared/utils/stayInfo';
import { formatDateForDisplay } from '../../shared/utils/date';
import { DeparturesField, TourBasicsFields, TourPlanFields, TourTermsFields, tourDraft, tourInput, tourProblem } from './TourFields';
import PhotoManager, { toPhotoInput, type EditablePhoto } from './PhotoManager';
import RegistrationFlow, { BookingModeField, type FlowPart, type FlowStep } from './RegistrationFlow';

const inputClass = 'mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] font-normal outline-none focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/15';
/** As for hotels: at least five photos, checked for size and blur before upload. */
const MIN_PHOTOS = 5;

const PARTS: FlowPart[] = [
  { name: 'Tour details', text: 'The basics. The kind of tour, where it goes and what happens each day.', action: 'Add tour details' },
  { name: 'Price & dates', text: 'The price per person, the group size and the dates guests can book.', action: 'Add price and dates' },
  { name: 'Photos', text: 'Show the places on the route so guests know what to expect.', action: 'Add photos' },
  { name: 'Final steps', text: 'Choose how bookings are confirmed before you open for bookings.', action: 'Add final details' },
];

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}{children}{hint && <span className="mt-1 block text-xs font-normal text-slate-500">{hint}</span>}</label>;
}

/**
 * Add a tour, one question per page with a hub between parts, like join.booking.com. One listing is one tour; its
 * single booking unit holds the adult price and the seats per departure. Nothing is saved until "Complete
 * registration" (or "Save as draft") creates the listing and its seat entry.
 */
export default function AddTourWizard({ onDone, onExit, registration }: {
  onDone: (listing: VendorListing, message: string) => void; onExit: () => void;
  /** A new partner: business details and documents come last, and submitting them creates and submits the tour. */
  registration?: (onSubmitted: () => void) => ReactNode;
}) {
  const [tour, setTour] = useState(() => tourDraft());
  const [about, setAbout] = useState({ title: '', location: '', description: '' });
  const [pin, setPin] = useState<LatLng>();
  const [seats, setSeats] = useState({ adultPrice: 0, count: 12 });
  const [departures, setDepartures] = useState<string[]>([]);
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [instantBook, setInstantBook] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { askReason, dialog } = useReasonDialog();

  const steps: FlowStep[] = [
    { id: 'tour', part: 'Tour details', title: 'What kind of tour is it?', intro: 'Guests filter by type, length and difficulty.', wide: true,
      tip: ['Not sure which type to pick?', 'Choose what guests would call it. You can change it later from your dashboard.'],
      problem: tourProblem(tour, 'tour'), content: <TourBasicsFields value={tour} onChange={setTour} /> },
    { id: 'about', part: 'Tour details', title: 'Tell guests about it', intro: 'The name and description appear on the tour page and in search.',
      tip: ['What makes a good description?', 'Who it suits, the highlights, the fitness needed and what to bring.'],
      problem: about.title.trim().length < 2 ? 'Give the tour a name.' : about.location.trim().length < 2 ? 'Add the area the tour covers.' : about.description.trim().length < 20 ? 'Write a description of at least 20 characters.' : '',
      content: <div className="grid gap-4">
        <Field label="Tour name" hint="e.g. “Hunza Valley 3-day tour” or “Rakaposhi Base Camp trek”."><input required maxLength={160} className={inputClass} value={about.title} onChange={(event) => setAbout({ ...about, title: event.target.value })} /></Field>
        <Field label="Area" hint="Where the tour goes, e.g. Hunza, Gilgit-Baltistan."><input required maxLength={240} className={inputClass} placeholder="Hunza, Gilgit-Baltistan" value={about.location} onChange={(event) => setAbout({ ...about, location: event.target.value })} /></Field>
        <Field label="Description"><textarea required minLength={20} maxLength={10000} className={`${inputClass} min-h-28 py-3`} value={about.description} onChange={(event) => setAbout({ ...about, description: event.target.value })} /></Field>
      </div> },
    { id: 'pin', part: 'Tour details', title: 'Pin the meeting point on the map', intro: 'Guests use it to find the group on the day.',
      tip: ['Is the red pin in the wrong place?', 'Tap the map where the tour starts. Use your current location only while you are there.'],
      problem: pin ? '' : 'Drop a pin where the tour starts.', content: <LocationPinField value={pin} onChange={setPin} location={about.location} /> },
    { id: 'plan', part: 'Tour details', title: 'What happens on the tour?', intro: 'Day by day, and what the price includes.', wide: true,
      tip: ['How detailed should the itinerary be?', 'One line per day is enough: where you go, where guests sleep and the meals.'],
      problem: tourProblem(tour, 'plan'), content: <TourPlanFields value={tour} onChange={setTour} /> },
    { id: 'price', part: 'Price & dates', title: 'Price, group size and dates', intro: 'The price is for the whole tour, per person.', wide: true,
      tip: ['How do I get paid?', 'Pay on arrival guests pay you at the start. Pay now money is held by GBBookings and paid out to you after the tour.'],
      problem: seats.adultPrice <= 0 ? 'Set the price per adult.' : seats.count < 1 ? 'Set how many guests can join one departure.'
        : tour.schedule === 'fixed' && departures.length === 0 ? 'Add at least one departure date.' : tourProblem(tour, 'price'),
      content: <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price per adult (PKR)"><input type="number" required min={1} max={1000000} className={inputClass} value={seats.adultPrice} onChange={(event) => setSeats({ ...seats, adultPrice: Number(event.target.value) })} /></Field>
          <Field label="Seats per departure" hint="We never book more."><input type="number" required min={1} max={500} className={inputClass} value={seats.count} onChange={(event) => setSeats({ ...seats, count: Number(event.target.value) })} /></Field>
        </div>
        <TourTermsFields value={tour} onChange={setTour} />
        {tour.schedule === 'fixed' && <div className="rounded-xl border border-slate-200 p-4"><p className="mb-3 text-sm font-semibold text-slate-700">Departure dates</p><DeparturesField value={departures} onChange={setDepartures} /></div>}
      </div> },
    { id: 'photos', part: 'Photos', title: 'What does the tour look like?', intro: `Upload at least ${MIN_PHOTOS} photos of places on the route. The first is the cover.`,
      tip: ['What if I don\'t have professional photos?', 'A phone camera is fine. Use your own photos from past trips, or ones you have permission to use.'],
      problem: photos.length < MIN_PHOTOS ? `Upload at least ${MIN_PHOTOS} photos (${photos.length} so far).` : '',
      content: <PhotoManager photos={photos} onChange={setPhotos} max={20} min={MIN_PHOTOS} qualityCheck label="Tour photos" onUploadingChange={setUploading} /> },
    { id: 'howwork', part: 'Final steps', title: 'How bookings work', intro: 'Some important info before you list your tour on GBBookings.',
      tip: ['Can I change this later?', 'Yes. Switch between instant confirmation and request to book any time from your dashboard.'],
      problem: '', content: <BookingModeField value={instantBook} onChange={setInstantBook} noun="tour" /> },
  ];

  const summary: Array<[string, string, string]> = [
    ['Tour', `${tour.category} · ${tour.durationDays} day${tour.durationDays === 1 ? '' : 's'} · ${tour.difficulty}${tour.minAge ? ` · age ${tour.minAge}+` : ''}`, 'tour'],
    ['Name & area', `${about.title || '—'} · ${about.location || '—'}`, 'about'],
    ['Meeting point', `${tour.meetingPoint || '—'}${tour.startTime ? ` at ${tour.startTime}` : ''}${pin ? ' · map pin set' : ''}`, 'pin'],
    ['Itinerary', `${tour.itinerary.filter((day) => day.title.trim()).length} day(s) · includes ${tour.included.join(', ') || 'nothing listed'}`, 'plan'],
    ['Price', `PKR ${seats.adultPrice.toLocaleString()} per adult${tour.childPricing ? ` · PKR ${tour.childPrice.toLocaleString()} per child` : ''} · ${seats.count} seats per departure`, 'price'],
    ['Dates', tour.schedule === 'daily' ? 'Any day you have not closed' : departures.map(formatDateForDisplay).join(', ') || '—', 'price'],
    ['Payment', tour.paymentMethods.map((method) => PAYMENT_LABELS[method]).join(', ') || '—', 'price'],
    ['Photos', `${photos.length} photo${photos.length === 1 ? '' : 's'}`, 'photos'],
    ['Bookings', instantBook ? 'Instant confirmation' : 'Request to book', 'howwork'],
  ];

  const exit = async () => {
    if ((about.title || about.description || photos.length) && await askReason({ title: 'Leave without saving?', destructive: true, confirmLabel: 'Discard tour', description: 'Nothing has been saved yet. Use Save as draft on the overview to keep it.' }) === null) return;
    onExit();
  };

  const finish = async (submit: boolean) => {
    const blocking = steps.map((item) => item.problem).find(Boolean);
    if (submit && blocking) { setError(blocking); return; }
    if (!submit && (about.title.trim().length < 2 || about.description.trim().length < 20 || !photos.length || seats.adultPrice <= 0)) {
      setError('To save a draft, add the tour name, its description, its price and at least one photo.');
      return;
    }
    setBusy(true); setError('');
    let created: VendorListing | null = null;
    try {
      created = (await api.createHotelListing({
        type: 'tour', title: about.title.trim(), location: about.location.trim(), description: about.description.trim(), price: seats.adultPrice,
        imageIds: photos.flatMap((photo) => (photo.mediaId ? [photo.mediaId] : [])), photos: toPhotoInput(photos),
        tourSpecs: tourInput(tour), ...(tour.schedule === 'fixed' ? { departures } : {}),
        stayInfo: { paymentMethods: tour.paymentMethods }, instantBook, ...(pin ? { coordinates: pin } : {}),
      })).data;
      // The tour's single booking unit: one seat per traveller, the count is the seats per departure.
      await api.addHotelRoom(created.id, {
        name: created.title, bedType: tour.category, maxAdults: 1, maxChildren: 1, totalRooms: seats.count, basePrice: seats.adultPrice, amenities: [],
      });
      if (submit) created = (await api.submitHotelListing(created.id)).data;
      onDone(created, submit ? `${created.title} was submitted. You will get an email once GBBookings has checked it.` : `${created.title} is saved as a draft. Submit it from its Price & seats tab when ready.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'The tour could not be saved.';
      if (created) onDone(created, `${created.title} was saved as a draft, but not everything went through: ${message} Finish it below.`);
      else setError(message);
    } finally { setBusy(false); }
  };

  return <>
    {dialog}
    <RegistrationFlow name={about.title.trim() || 'New tour'} subtitle={about.location} parts={PARTS} steps={steps} summary={summary}
      busy={busy} uploading={uploading} error={error} setError={setError}
      onSaveDraft={() => void finish(false)} onSubmit={() => void finish(true)} onExit={exit}
      verification={registration?.(() => void finish(true))} />
  </>;
}
