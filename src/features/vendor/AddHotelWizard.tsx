import { useEffect, useState, type ReactNode } from "react";
import { Check, ChevronLeft, Image as ImageIcon, Lightbulb, LoaderCircle, Plus } from "lucide-react";
import {
  api,
  EXPERIENCE_TYPES,
  type LatLng,
  type VendorListing,
} from "../../shared/api/api";
import { AddressFields, LocationPinField } from "../../shared/components/MapPin";
import { useReasonDialog } from "../../shared/components/ReasonDialog";
import ChipInput from "./ChipInput";
import { defaultExtras, ExtrasFields, extrasInput, extrasLines, extrasProblem, FacilityChecklist, type Extras, StarsField } from "./PropertyExtrasFields";
import HomestayHostFields, {
  homestayDraft,
  homestayInput,
} from "./HomestayHostFields";
import PhotoManager, { toPhotoInput, type EditablePhoto } from "./PhotoManager";
import StayInfoFields, {
  defaultStayInfo,
  PaymentMethodsField,
  stayInfoProblem,
} from "./StayInfoFields";
import { openSeason, PAYMENT_LABELS } from "../../shared/utils/stayInfo";
import { CANCELLATION_POLICIES, policyLines, type CancellationPolicy } from "../../shared/utils/cancellation";
import { addressLine, HOME_TYPES, HOTEL_TYPES, roomFacts, STAFF_LANGUAGES, type PropertyAddress } from "../../shared/utils/rooms";
import {
  emptyRoom,
  entireHome,
  newRoom,
  primaryButton,
  RoomForm,
  secondaryButton,
} from "./RoomManager";
import type { VendorRoomInput } from "../../shared/api/api";
import Select, { TimeInput } from '../../shared/components/Select';

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] outline-none focus:border-[#006F3C] focus:ring-2 focus:ring-[#006F3C]/15";
const choiceClass = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected ? "border-[#006F3C] bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"}`;

type StepId =
  | "type" | "stay" | "count" | "confirm" | "ota" | "name"
  | "address" | "pin" | "calendar"
  | "facilities" | "extras" | "languages" | "rules" | "policies" | "host"
  | "rooms" | "rates" | "photos"
  | "payments" | "invoicing" | "howwork"
  | "review" | "business";

/** The four parts of Booking.com's registration hub; each ends back on the hub. */
const SECTIONS = ["Property details", "Units", "Photos", "Final steps"] as const;
type Section = typeof SECTIONS[number];

/** One small question per step. The section is the hub card it belongs to. */
const STEP_TEXT: Record<StepId, { section: Section; title: string; intro: string }> = {
  type: { section: "Property details", title: "Which best describes your place?", intro: "Guests filter by this, so pick the closest match." },
  stay: { section: "Property details", title: "What can guests book?", intro: "This decides whether guests book the whole place or a room in it." },
  count: { section: "Property details", title: "How many are you listing?", intro: "Each property is listed on its own." },
  confirm: { section: "Property details", title: "Does this sound like your property?", intro: "" },
  ota: { section: "Property details", title: "Where else is your property listed?", intro: "" },
  name: { section: "Property details", title: "What is your property called?", intro: "The name and description appear on the property page and in search." },
  address: { section: "Property details", title: "Where is your property?", intro: "Write the address the way a driver would find it: area, village or road, and town." },
  pin: { section: "Property details", title: "Pin it on the map", intro: "Guests use the pin for directions and the map search. Tap the map where the entrance is." },
  calendar: { section: "Property details", title: "Do you use another booking site's calendar?", intro: "If you also take bookings on Airbnb, Booking.com or a Google Calendar, we can keep the dates in step so you are never double-booked." },
  facilities: { section: "Property details", title: "What can guests use?", intro: "Tick everything guests can use at the property. Guests filter search results by these." },
  extras: { section: "Property details", title: "Breakfast and parking", intro: "Most guests in Gilgit-Baltistan arrive by car or jeep, so tell them where to park." },
  languages: { section: "Property details", title: "What languages do you or your staff speak?", intro: "Guests who share a language book more easily." },
  rules: { section: "Property details", title: "House rules", intro: "Check-in and check-out times are shown on every booking. You can add more rules later." },
  policies: { section: "Property details", title: "Policies and mountain essentials", intro: "Guests check these before they book: how to pay, children and pets, and power, heating, signal and the road in." },
  host: { section: "Property details", title: "Introduce the host and meals", intro: "Guests choose homestays for the people and the food." },
  rooms: { section: "Units", title: "What do guests book?", intro: "Add one category per kind of room, such as Deluxe Double or Family Room. We never sell more rooms than you set." },
  rates: { section: "Units", title: "Rate plans", intro: "To attract a wider range of guests, we suggest several rate plans. They are filled in with what works for properties like yours; change them now or later from your dashboard." },
  photos: { section: "Photos", title: "What does your property look like?", intro: "Upload at least 5 photos. The first is the cover in search results; captions help guests. You can add more later." },
  payments: { section: "Final steps", title: "Payments", intro: "How can your guests pay for their stay?" },
  invoicing: { section: "Final steps", title: "Invoicing", intro: "GBBookings sends you statements for your bookings and commission. Choose the name they carry." },
  howwork: { section: "Final steps", title: "How bookings work", intro: "Some important info before you list your property on GBBookings." },
  review: { section: "Final steps", title: "Your registration", intro: "Finish each part. GBBookings checks new properties before guests can book them, usually within a day, and emails you either way." },
  business: { section: "Final steps", title: "Your business details", intro: "Last step: who runs the property, and the documents GBBookings needs to verify you. Your listing is submitted with them." },
};

/** One line per property type, as on Booking.com's tiles. */
const TYPE_TEXT: Record<string, string> = {
  Hotel: "Rooms for travellers, often with a restaurant and other guest services.",
  "Guest House": "A private home with separate living space for host and guests.",
  "Bed and breakfast": "A private home offering overnight stays and breakfast.",
  Hostel: "Budget stays with mostly dorm-style beds and a social feel.",
  Lodge: "A small inn in the mountains or the countryside.",
  Motel: "Roadside rooms with parking at the door.",
  Resort: "A place to stay with leisure facilities on site.",
  "Boutique Hotel": "A small, stylish hotel with its own character.",
  Campsite: "Pitches or tents in the open, often with shared facilities.",
  Glamping: "Comfortable tents, domes or cabins in nature.",
  Homestay: "A family home where guests share living space with the host.",
  Apartment: "A furnished, self-catering flat.",
  "Holiday home": "A whole house for guests on holiday.",
  Villa: "A large private house, often with a garden.",
  "Cottage / Chalet": "A small wooden or stone house in the mountains.",
  "Farm stay": "A working farm with simple rooms.",
};
const OTHER_SITES = ["Booking.com", "Airbnb", "Agoda", "Another website", "My property isn't listed on any other websites"];

/** The tip card beside each step page, like Booking.com's "What if…" boxes. */
const TIPS: Partial<Record<StepId, [string, string]>> = {
  type: ["Not sure which to pick?", "Choose the type guests would call your place. Guests filter search by it, and you can change it later."],
  count: ["Listing more than one?", "List the first now. Afterwards, Duplicate in your dashboard copies it, so the next only needs its own name, address, photos and rooms."],
  ota: ["Why do you ask?", "If guests can book you elsewhere, connect those calendars after approval so the same night is never sold twice."],
  name: ["What makes a good description?", "Mention the view, the food and how far the main sights are. Guests read it before they book."],
  address: ["Why do we need the address?", "Guests see the full address once they have booked, together with the map pin."],
  pin: ["Is the red pin in the wrong place?", "Tap the map where the entrance is. Use your current location only while you are at the property."],
  calendar: ["What is calendar sync?", "Paste the calendar link from another site, and dates booked there close here automatically."],
  facilities: ["What if I don't see a facility I offer?", "These are the ones guests search for most. You can add more from your dashboard after registration."],
  extras: ["Why parking?", "Most guests in Gilgit-Baltistan arrive by car or jeep and look for parking before they book."],
  languages: ["Why languages?", "Guests book more easily when they know they can talk to you."],
  rules: ["What if my house rules change?", "You can change them, and add more rules, from your dashboard after registration."],
  policies: ["Why the mountain essentials?", "Power cuts, heating and the road in decide many winter trips. Honest answers prevent bad reviews."],
  rates: ["Why several rate plans?", "Guests sure of their dates take the cheaper non-refundable rate, long stays fill quiet weeks, and solo travellers book rooms that would stay empty."],
  rooms: ["Can I add more rooms later?", "Yes. Add one category now; you can add more and set prices by date from your dashboard."],
  photos: ["What if I don't have professional photos?", "A phone camera is fine. Shoot in daylight, keep rooms tidy, and only use photos you took or have permission to use."],
  payments: ["How do I get paid?", "Pay on arrival guests pay you directly. Pay now money is held by GBBookings and paid out to you after the stay."],
  invoicing: ["What goes on the invoice?", "The name you choose here, the property's address, and your NTN from your business profile."],
  howwork: ["Can I change this later?", "Yes. Switch between instant confirmation and request to book any time from your dashboard."],
};

/** Booking.com asks for at least five photos before a property can open. */
const MIN_PHOTOS = 5;

type DraftRoom = { input: VendorRoomInput; photos: EditablePhoto[] };

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`text-sm font-semibold text-slate-700 ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}

/**
 * Add a hotel or home one small step at a time; each step replaces the last on the same screen. Progress is saved on
 * the server on every step and reopens where the partner left off. The review step creates the listing (and submits
 * it). A new partner passes `registration`: the business details and documents come last, and submitting them
 * creates and submits the listing together with the application.
 */
export default function AddHotelWizard({
  kind = "hotel",
  registration,
  onDone,
  onExit,
}: {
  kind?: "hotel" | "homestay";
  /** Renders the business registration; it calls `onSubmitted` once the application is submitted. */
  registration?: (onSubmitted: () => void) => ReactNode;
  onDone: (listing: VendorListing, message: string) => void;
  onExit: () => void;
}) {
  const homestay = kind === "homestay";
  const [hotel, setHotel] = useState({
    title: "",
    hotelType: homestay ? "Homestay" : "Hotel",
    description: "",
    location: "",
    checkInTime: homestay ? "13:00" : "14:00",
    checkOutTime: "11:00",
    // Time windows, as on Booking.com: check-in until, check-out from.
    checkInUntil: "22:00",
    checkOutFrom: "07:00",
    howMany: "one" as "one" | "several",
    languages: [] as string[],
    partOfChain: false,
    chainName: "",
    calendarSync: false,
    instantBook: false,
    invoiceAs: "property" as "property" | "legal",
    invoiceName: "",
    // Draft only: which other sites list the property (Booking.com offers to import from them).
    otherSites: [] as string[],
  });
  // Booking.com's rate plans, switched on with its suggested percents. Weekly becomes each room's long-stay deal.
  const [rates, setRates] = useState({
    policy: "flexible" as Exclude<CancellationPolicy, "non_refundable">,
    singleGuest: true, singleGuestPercent: 10,
    nonRefundable: true, nonRefundablePercent: 10,
    weekly: true, weeklyPercent: 15,
  });
  const [host, setHost] = useState(() => homestayDraft());
  const [pin, setPin] = useState<LatLng>();
  const [address, setAddress] = useState<PropertyAddress>({ line1: "", area: "", city: "", region: "Gilgit-Baltistan", postcode: "" });
  const [stayInfo, setStayInfo] = useState(defaultStayInfo);
  const [amenities, setAmenities] = useState<string[]>([]);
  const [facilities, setFacilities] = useState<string[]>([]);
  const [extras, setExtras] = useState<Extras>(() => defaultExtras(!homestay));
  const [policies, setPolicies] = useState<string[]>([]);
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [rooms, setRooms] = useState<DraftRoom[]>([]);
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  // The hub (Booking.com's step overview) shows between parts; `furthest` is how far the partner has got.
  const [showHub, setShowHub] = useState(false);
  const [furthest, setFurthest] = useState(0);
  const { askReason, dialog } = useReasonDialog();
  const singleUnit = homestay && host.stayType === "entire_home";
  const noun = hotel.hotelType.toLowerCase();

  // Homestays ask languages with the host, so only hotels get their own languages step.
  const steps: StepId[] = [
    "type", ...(homestay ? ["stay" as const] : []), "count", "confirm", "ota", "name",
    "address", "pin", "calendar",
    "facilities", "extras", ...(homestay ? [] : ["languages" as const]), "rules", "policies", ...(homestay ? ["host" as const] : []),
    "rooms", "rates", "photos",
    "payments", "invoicing", "howwork",
    "review", ...(registration ? ["business" as const] : []),
  ];
  const id = steps[Math.min(step, steps.length - 1)];

  // Saved progress: loaded once, then saved on every step change and on exit.
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [savedAt, setSavedAt] = useState<string>();
  const [resumedFrom, setResumedFrom] = useState<string>();
  const snapshot = () => ({ rates, hotel, address, extras, host, pin, stayInfo, amenities, facilities, policies, photos, rooms });
  useEffect(() => {
    let active = true;
    api.getListingDraft(kind).then((draft) => {
      if (!active || !draft) return;
      const data = draft.data as Partial<ReturnType<typeof snapshot>>;
      if (data.hotel) setHotel((value) => ({ ...value, ...data.hotel }));
      if (data.rates) setRates((value) => ({ ...value, ...data.rates }));
      // Drafts saved before the address had parts keep their one line as the street.
      if (data.address) setAddress(data.address);
      else if (data.hotel?.location) setAddress((value) => ({ ...value, line1: data.hotel!.location }));
      if (data.host) setHost((value) => ({ ...value, ...data.host }));
      if (data.stayInfo) setStayInfo((value) => ({ ...value, ...data.stayInfo }));
      setPin(data.pin);
      setAmenities(data.amenities ?? []);
      setFacilities(data.facilities ?? []);
      if (data.extras) setExtras(data.extras);
      setPolicies(data.policies ?? []);
      setPhotos(data.photos ?? []);
      setRooms(data.rooms ?? []);
      setStep(Math.min(draft.step, steps.length - 1));
      setFurthest(Math.min(draft.step, steps.length - 1));
      // Coming back to a saved registration starts on the hub, like Booking.com.
      if (draft.step > 0) setShowHub(true);
      setSavedAt(draft.updatedAt);
      setResumedFrom(draft.updatedAt);
    }).catch(() => undefined).finally(() => active && setLoadingDraft(false));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);
  const saveDraft = async (atStep: number) => {
    try {
      setSavedAt((await api.saveListingDraft(kind, atStep, snapshot())).updatedAt);
      return true;
    } catch {
      setError("Your progress could not be saved. Check your connection; your entries are still on this page.");
      return false;
    }
  };

  const problems: Partial<Record<StepId, string>> = {
    name: hotel.title.trim().length < 2 ? "Add the name of your property."
      : hotel.description.trim().length < 20 ? "Write a description of at least 20 characters."
      : hotel.partOfChain && hotel.chainName.trim().length < 2 ? "Add the name of the group, chain or company." : "",
    address: address.line1.trim().length < 2 || address.city.trim().length < 2 ? "Add the street or village and the town." : "",
    pin: pin ? "" : "Drop a pin on the map where the property is.",
    ota: hotel.otherSites.length ? "" : "Tick where else the property is listed, or that it isn't listed anywhere else.",
    policies: stayInfoProblem(stayInfo),
    extras: extrasProblem(extras),
    host: host.hostName.trim().length < 2 ? "Add the host name."
      : host.meals.some((meal) => meal.offered && !meal.included && meal.price <= 0) ? "Set a price for each extra meal, or mark it included." : "",
    // An open room form is not saved yet: say so instead of "add a room", and never drop it silently.
    rooms: editing !== null ? `Press ${editing === "new" && !singleUnit ? "Add this room" : "Save"} to keep this room, or Cancel.`
      : rooms.length === 0 ? (singleUnit ? "Set up the place: bedrooms, beds and price." : "Add at least one room category.") : "",
    photos: photos.length < MIN_PHOTOS ? `Upload at least ${MIN_PHOTOS} photos (${photos.length} so far).` : "",
    rates: ([[rates.singleGuest, rates.singleGuestPercent], [rates.nonRefundable, rates.nonRefundablePercent], [rates.weekly, rates.weeklyPercent]] as const).some(([on, percent]) => on && (percent < 1 || percent > 50))
      ? "Each discount must be between 1% and 50%." : "",
    payments: stayInfo.paymentMethods.length ? "" : "Choose at least one way guests can pay at the property.",
    invoicing: hotel.invoiceAs === "legal" && hotel.invoiceName.trim().length < 2 ? "Add the legal company name for your invoices." : "",
  };
  const firstProblem = (upTo: number) => steps.slice(0, upTo).map((stepId) => problems[stepId]).find(Boolean);
  const sectionOf = (index: number) => STEP_TEXT[steps[index]].section;
  const go = (next: number) => {
    const blocking = firstProblem(next);
    if (next > step && blocking) {
      setError(blocking);
      return;
    }
    setError("");
    setEditing(null);
    // Finishing a part goes back to the hub, as on Booking.com.
    setShowHub(next > step && sectionOf(next) !== sectionOf(step) && steps[next] !== "business");
    setFurthest((value) => Math.max(value, next));
    // The welcome-back note is for the first page after resuming only.
    setResumedFrom(undefined);
    setStep(next);
    void saveDraft(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const exit = async () => {
    if (hotel.title || hotel.description || photos.length || rooms.length) {
      setBusy(true);
      const saved = await saveDraft(step);
      setBusy(false);
      if (!saved) return;
    }
    onExit();
  };
  const discard = async () => {
    if ((await askReason({ title: `Discard this ${noun}?`, destructive: true, confirmLabel: "Discard", description: "Your saved progress on every step will be deleted." })) === null) return;
    await api.deleteListingDraft(kind).catch(() => undefined);
    onExit();
  };
  const setStayType = (stayType: "rooms" | "entire_home") => {
    // Switching between whole place and rooms changes what a booking unit is, so start the rooms step over.
    if (stayType !== host.stayType) {
      setRooms([]);
      setEditing(null);
    }
    setHost({ ...host, stayType });
  };

  const finish = async (submit: boolean) => {
    const blocking = firstProblem(steps.length);
    if (blocking) {
      setError(blocking);
      return;
    }
    setBusy(true);
    setError("");
    let created: VendorListing | null = null;
    try {
      created = (await api.createHotelListing({
        type: kind,
        title: hotel.title.trim(),
        location: addressLine(address),
        address: { line1: address.line1.trim(), city: address.city.trim(), ...Object.fromEntries((["area", "region", "postcode"] as const).flatMap((key) => (address[key]?.trim() ? [[key, address[key]!.trim()]] : []))) },
        description: hotel.description.trim(),
        price: Math.min(...rooms.map((room) => room.input.basePrice)),
        imageIds: photos.flatMap((photo) => (photo.mediaId ? [photo.mediaId] : [])),
        photos: toPhotoInput(photos),
        hotelSpecs: {
          hotelType: hotel.hotelType, amenities, facilities, policies, checkInTime: hotel.checkInTime, checkOutTime: hotel.checkOutTime,
          checkInUntil: hotel.checkInUntil, checkOutFrom: hotel.checkOutFrom,
          ...(hotel.languages.length ? { languages: hotel.languages } : {}),
          ...(hotel.partOfChain && hotel.chainName.trim() ? { chainName: hotel.chainName.trim() } : {}),
          invoiceName: hotel.invoiceAs === "legal" ? hotel.invoiceName.trim() : hotel.title.trim(),
          ...extrasInput(extras),
        },
        instantBook: hotel.instantBook,
        cancellationPolicy: rates.policy,
        ratePlans: {
          ...(rates.singleGuest ? { singleGuestPercent: rates.singleGuestPercent } : {}),
          ...(rates.nonRefundable ? { nonRefundablePercent: rates.nonRefundablePercent } : {}),
        },
        ...(homestay ? { homestaySpecs: homestayInput(host) } : {}),
        ...(pin ? { coordinates: pin } : {}),
        stayInfo,
      })).data;
      // The weekly rate plan is a long-stay deal on each room (7 nights or more).
      const weekly = rates.weekly ? { longStay: { nights: 7, percent: rates.weeklyPercent } } : undefined;
      for (const room of rooms) await api.addHotelRoom(created.id, { ...emptyRoom, ...room.input, ...(singleUnit ? { totalRooms: 1 } : {}), ...(weekly && !room.input.deals?.longStay ? { deals: { ...room.input.deals, ...weekly } } : {}) });
      if (submit) created = (await api.submitHotelListing(created.id)).data;
      onDone(created, submit
        ? `${created.title} was submitted. You will get an email once GBBookings has checked it.`
        : `${created.title} is saved as a draft. Submit it from its Rooms tab when ready.`);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : `The ${noun} could not be saved.`;
      // The listing exists even if a room failed; send the partner to finish it in the workspace.
      if (created) onDone(created, `${created.title} was saved as a draft, but not everything went through: ${message} Finish it below.`);
      else setError(message);
    } finally {
      setBusy(false);
    }
  };

  const fromPrice = rooms.length ? Math.min(...rooms.map((room) => room.input.basePrice)) : null;
  const offeredMeals = host.meals.filter((meal) => meal.offered);
  const listingWhat = `${hotel.howMany === "one" ? `one ${noun}` : `several ${noun}s, one at a time`} where guests book ${singleUnit ? "the entire place" : "a room"}`;
  const reviewRows: Array<[string, string, StepId]> = [
    ["Property", `${hotel.title || "—"} · ${hotel.hotelType}${homestay ? ` · ${host.experienceType} · ${singleUnit ? "Entire place" : "Private rooms"}` : ""}`, "name"],
    ["Address", `${addressLine(address) || "—"}${pin ? " · map pin set" : " · no map pin"}`, "address"],
    ["Facilities", [...amenities, ...facilities].join(", ") || "None added", "facilities"],
    [homestay ? "Parking" : "Breakfast & parking", extrasLines(extrasInput(extras)).join(" · "), "extras"],
    ["Calendar sync", hotel.calendarSync ? "Will connect another calendar" : "Not now", "calendar"],
    ...(homestay ? [] : [["Languages", hotel.languages.join(", ") || "None added", "languages"] as [string, string, StepId]]),
    ["House rules", `Check-in ${hotel.checkInTime}–${hotel.checkInUntil}, check-out ${hotel.checkOutFrom}–${hotel.checkOutTime}${policies.length ? ` · ${policies.join(", ")}` : ""}`, "rules"],
    ["Policies & essentials", `Children ${stayInfo.childrenAllowed ? "welcome" : "not allowed"} · pets ${!stayInfo.petsAllowed ? "not allowed" : stayInfo.petsOnRequest ? "on request" : "allowed"} · ${openSeason(stayInfo.openMonths)}`, "policies"],
    ["Payments", `Pay now online, or on arrival by ${stayInfo.paymentMethods.map((method) => PAYMENT_LABELS[method]).join(", ") || "—"}`, "payments"],
    ["Invoicing", hotel.invoiceAs === "legal" ? hotel.invoiceName || "—" : hotel.title || "Property name", "invoicing"],
    ["Bookings", hotel.instantBook ? "Instant confirmation" : "Request to book", "howwork"],
    ...(homestay ? [["Host & meals", `${host.hostName || "—"}${host.languages.length ? ` · ${host.languages.join(", ")}` : ""} · ${offeredMeals.length ? offeredMeals.map((meal) => `${meal.type} ${meal.included ? "included" : `PKR ${meal.price}`}`).join(", ") : "no meals"}`, "host"] as [string, string, StepId]] : []),
    ["Rooms", rooms.map((room) => singleUnit
      ? [room.input.bedType, ...roomFacts(room.input), `up to ${room.input.maxAdults + room.input.maxChildren} guests`].join(", ")
      : `${room.input.name} (${room.input.totalRooms})`).join(", ") || "None yet", "rooms"],
    ["Rate plans", [`Standard, ${CANCELLATION_POLICIES[rates.policy].label.toLowerCase()} cancellation`, rates.nonRefundable && `non-refundable −${rates.nonRefundablePercent}%`, rates.weekly && `weekly −${rates.weeklyPercent}%`, rates.singleGuest && `one guest −${rates.singleGuestPercent}%`].filter(Boolean).join(" · "), "rates"],
    ["Photos", `${photos.length} photo${photos.length === 1 ? "" : "s"}`, "photos"],
  ];

  // The hub: one card per part, done once the partner has gone past its last step with nothing missing.
  const hubParts = SECTIONS.map((name, index) => {
    const ids = steps.filter((stepId) => STEP_TEXT[stepId].section === name && stepId !== "review" && stepId !== "business");
    const first = steps.indexOf(ids[0]);
    const last = steps.indexOf(ids[ids.length - 1]);
    return { name, index, first, done: furthest > last && ids.every((stepId) => !problems[stepId]) };
  });
  const HUB_TEXT: Record<Section, [string, string]> = {
    "Property details": ["The basics. Add your property name, address, facilities and more.", "Add property details"],
    Units: [singleUnit ? "Tell us about the place: bedrooms, beds and price." : "Tell us about your first room. Once you've set one up, you can add more.", singleUnit ? "Set up the place" : "Add unit"],
    Photos: ["Share some photos of your property so guests know what to expect.", "Add photos"],
    "Final steps": ["Set up payments and invoicing before you open for bookings.", "Add final details"],
  };
  const openPart = (first: number) => { setShowHub(false); setError(""); setStep(first); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const allDone = hubParts.every((part) => part.done);

  if (loadingDraft)
    return <div className="flex min-h-64 items-center justify-center" role="status"><LoaderCircle className="size-7 animate-spin text-[#006F3C]" /><span className="sr-only">Loading your saved progress</span></div>;

  const last = id === "review" || id === "business";
  const hub = showHub || id === "review";

  return (
    <div className="flex flex-wrap items-start gap-7">
      {dialog}
      <div className="min-w-0 flex-[999_1_520px] space-y-5">
        {hub ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{hotel.title || `Your ${noun}`}</h2>
                <p className="mt-1 text-sm text-slate-500">{STEP_TEXT.review.intro}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm font-semibold">
                {savedAt && <button type="button" onClick={discard} disabled={busy} className="min-h-11 text-rose-700 hover:text-rose-900">Discard</button>}
                <button type="button" onClick={exit} disabled={busy} className="min-h-11 text-slate-600 hover:text-slate-900">Save and exit</button>
              </div>
            </div>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
            <ol className="space-y-3">
              {hubParts.map((part) => {
                const locked = hubParts.slice(0, part.index).some((before) => !before.done);
                const rows = reviewRows.filter(([, , target]) => STEP_TEXT[target].section === part.name);
                return (
                  <li key={part.name} className="rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full ${part.done ? "bg-[#006F3C] text-white" : "border-2 border-slate-300 text-slate-400"}`}>
                        {part.done ? <Check className="size-5" /> : part.index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-500">Step {part.index + 1}{part.done ? " · done" : ""}</p>
                        <h3 className="font-extrabold">{part.name}</h3>
                        <p className="text-sm text-slate-500">{HUB_TEXT[part.name][0]}</p>
                      </div>
                      {part.done
                        ? <button type="button" className="min-h-11 text-sm font-bold text-[#006F3C]" onClick={() => openPart(part.first)}>Edit</button>
                        : <button type="button" className={locked ? secondaryButton : primaryButton} disabled={locked} onClick={() => openPart(part.first)}>{HUB_TEXT[part.name][1]}</button>}
                    </div>
                    {part.done && rows.length > 0 && (
                      <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                        {rows.map(([label, value, target]) => (
                          <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                            <dt className="text-sm font-bold">{label}</dt>
                            <dd className="min-w-0 flex-1 text-right text-sm text-slate-600">{value} <button type="button" className="ml-2 font-bold text-[#006F3C]" onClick={() => openPart(steps.indexOf(target))}>Edit</button></dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {part.name === "Photos" && part.done && <div className="mt-3 flex gap-2 overflow-x-auto">{photos.slice(0, 6).map((photo, at) => <img key={at} src={photo.url} alt="" className="h-14 w-20 shrink-0 rounded-md object-cover" />)}</div>}
                  </li>
                );
              })}
            </ol>
            {registration ? (
              <button type="button" className={`${primaryButton} w-full`} disabled={!allDone} onClick={() => go(steps.indexOf("business"))}>Continue to partner verification</button>
            ) : (
              <div className="flex flex-wrap justify-end gap-2">
                <button type="button" className={secondaryButton} disabled={busy} onClick={() => finish(false)}>Save as draft</button>
                <button type="button" className={primaryButton} disabled={busy || !allDone} onClick={() => finish(true)}>{busy && <LoaderCircle className="size-4 animate-spin" />}Complete registration</button>
              </div>
            )}
            {!allDone && <p className="text-center text-xs text-slate-500">Finish every step to complete your registration. Your progress is saved.</p>}
          </div>
        ) : <>
        {/* Like Booking.com: no step counter on the pages, only the property and a way out; progress lives on the hub. */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <p className="min-w-0 truncate text-sm text-slate-500" aria-label={STEP_TEXT[id].section}>
            {hotel.title ? <><strong className="text-slate-900">{hotel.title}</strong>{addressLine(address) && ` · ${addressLine(address)}`}</> : `New ${noun}`}
          </p>
          <div className="flex shrink-0 gap-3 text-sm font-semibold">
            {savedAt && <button type="button" onClick={discard} disabled={busy} className="min-h-11 text-rose-700 hover:text-rose-900">Discard</button>}
            <button type="button" onClick={exit} disabled={busy} className="min-h-11 text-slate-600 hover:text-slate-900">Save and exit</button>
          </div>
        </div>
        <div className={`space-y-5 ${id === "rooms" || id === "policies" || id === "host" ? "max-w-3xl" : "max-w-xl"}`}>

        {resumedFrom && step > 0 && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Welcome back. We kept everything you entered on {new Date(resumedFrom).toLocaleString()}, so you can carry on from here.</p>}

        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{id === "extras" && homestay ? "Parking" : STEP_TEXT[id].title}</h2>
          {STEP_TEXT[id].intro && <p className="mt-1.5 text-sm leading-6 text-slate-500">{id === "rooms" && singleUnit ? "Guests book the whole place. Add its bedrooms and beds, how many people it sleeps and the price per night." : STEP_TEXT[id].intro}</p>}
        </div>
        {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

        {id === "type" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {(homestay ? HOME_TYPES : HOTEL_TYPES).map((value) => (
              <label key={value} className={choiceClass(hotel.hotelType === value)}>
                <input type="radio" name="property-type" className="mt-1 size-4 accent-[#006F3C]" checked={hotel.hotelType === value} onChange={() => setHotel({ ...hotel, hotelType: value })} />
                <span><span className="block text-sm font-bold">{value}</span>{TYPE_TEXT[value] && <span className="text-xs leading-5 text-slate-500">{TYPE_TEXT[value]}</span>}</span>
              </label>
            ))}
          </div>
        )}

        {id === "ota" && (
          <div className="space-y-1 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="pb-2 text-sm text-slate-600">If your property is on other travel sites, tell us. You can connect their calendars later so you are never double-booked.</p>
            {OTHER_SITES.map((site) => {
              const none = site === OTHER_SITES[OTHER_SITES.length - 1];
              const on = hotel.otherSites.includes(site);
              return <label key={site} className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-[#006F3C]" checked={on}
                onChange={() => setHotel({ ...hotel, otherSites: on ? hotel.otherSites.filter((item) => item !== site) : none ? [site] : [...hotel.otherSites.filter((item) => item !== OTHER_SITES[OTHER_SITES.length - 1]), site] })} />{site}</label>;
            })}
          </div>
        )}

        {id === "stay" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {([["entire_home", "Entire place", "Guests have the whole place to themselves and don't share it with the host or other guests."],
              ["rooms", "Private rooms", "Guests book a room in the property; common areas are shared with the host or other guests."]] as const).map(([value, label, text]) => (
              <label key={value} className={choiceClass(host.stayType === value)}>
                <input type="radio" name="stay-type" checked={host.stayType === value} onChange={() => setStayType(value)} className="mt-1 size-4 accent-[#006F3C]" />
                <span><span className="block text-sm font-bold">{label}</span><span className="text-xs text-slate-500">{text}</span></span>
              </label>
            ))}
          </div>
        )}

        {id === "count" && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {([["one", `One ${noun}`], ["several", `Several ${noun}s`]] as const).map(([value, label]) => (
                <label key={value} className={choiceClass(hotel.howMany === value)}>
                  <input type="radio" name="how-many" checked={hotel.howMany === value} onChange={() => setHotel({ ...hotel, howMany: value })} className="mt-1 size-4 accent-[#006F3C]" />
                  <span className="text-sm font-bold">{label}</span>
                </label>
              ))}
            </div>
            {hotel.howMany === "several" && <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">List the first one now. Afterwards, "Duplicate" in your dashboard copies it so the next one only needs its own name, address, photos and rooms.</p>}
          </div>
        )}

        {id === "confirm" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">You're listing:</p>
            <p className="mt-2 text-xl font-extrabold first-letter:uppercase">{listingWhat}</p>
            <button type="button" onClick={() => go(0)} className={`${secondaryButton} mt-5`}>No, I need to make a change</button>
          </div>
        )}

        {id === "name" && (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <Field label="Property name" wide>
              <input className={inputClass} required maxLength={160} value={hotel.title} onChange={(e) => setHotel({ ...hotel, title: e.target.value })} placeholder={homestay ? "Karimabad Family Home" : "Shigar Riverside Lodge"} />
            </Field>
            {homestay && (
              <Field label="Experience">
                <Select className={inputClass} value={host.experienceType} onChange={(e) => setHost({ ...host, experienceType: e.target.value as typeof host.experienceType })}>
                  {EXPERIENCE_TYPES.map((value) => <option key={value}>{value}</option>)}
                </Select>
              </Field>
            )}
            <Field label="Description" wide>
              <textarea className={`${inputClass} min-h-36 py-3`} maxLength={10000} value={hotel.description} onChange={(e) => setHotel({ ...hotel, description: e.target.value })}
                placeholder={homestay ? "Your home, the village, what guests can do with your family: farm walks, cooking, local festivals." : "What makes the stay special: views, food, how far the main sights are."} />
              <span className="mt-1 block text-xs font-normal text-slate-500">{hotel.description.trim().length}/20 characters minimum</span>
            </Field>
            {!homestay && <Field label="Official star rating (if you have one)" wide>
              <StarsField value={extras.stars} onChange={(stars) => setExtras({ ...extras, stars })} className={inputClass} />
            </Field>}
            {!homestay && <fieldset className="sm:col-span-2">
              <legend className="text-sm font-semibold text-slate-700">Are you a property management company or part of a group or chain?</legend>
              <div className="mt-1 flex gap-4">{([[false, "No"], [true, "Yes"]] as const).map(([value, text]) =>
                <label key={text} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="chain" className="size-4 accent-[#006F3C]" checked={hotel.partOfChain === value} onChange={() => setHotel({ ...hotel, partOfChain: value })} />{text}</label>)}</div>
              {hotel.partOfChain && <input className={inputClass} maxLength={120} value={hotel.chainName} onChange={(e) => setHotel({ ...hotel, chainName: e.target.value })} placeholder="Name of the group, chain or company" aria-label="Name of the group, chain or company" />}
            </fieldset>}
            <Field label="Tourism department registration number (if you have one)" wide>
              <input className={inputClass} maxLength={60} value={extras.licenceNumber ?? ""} onChange={(e) => setExtras({ ...extras, licenceNumber: e.target.value })} placeholder="e.g. GB Tourism Department registration" />
            </Field>
          </div>
        )}

        {id === "address" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <AddressFields value={address} onChange={setAddress} onPin={setPin} />
          </div>
        )}

        {id === "pin" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <LocationPinField value={pin} onChange={setPin} location={addressLine(address)} />
          </div>
        )}

        {id === "facilities" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            {/* One checklist; facilities typed into older drafts are folded in. */}
            <FacilityChecklist value={[...new Set([...amenities, ...facilities])]} onChange={(value) => { setAmenities(value); setFacilities([]); }} />
          </div>
        )}

        {id === "extras" && <div className="rounded-2xl border border-slate-200 bg-white p-5"><ExtrasFields value={extras} onChange={setExtras} /></div>}

        {id === "rules" && (
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
            <p className="text-sm font-bold text-slate-900 sm:col-span-2">What are your check-in and check-out times?</p>
            <Field label="Check-in from"><TimeInput className={inputClass} value={hotel.checkInTime} onChange={(e) => setHotel({ ...hotel, checkInTime: e.target.value })} /></Field>
            <Field label="Check-in until"><TimeInput className={inputClass} value={hotel.checkInUntil} onChange={(e) => setHotel({ ...hotel, checkInUntil: e.target.value })} /></Field>
            <Field label="Check-out from"><TimeInput className={inputClass} value={hotel.checkOutFrom} onChange={(e) => setHotel({ ...hotel, checkOutFrom: e.target.value })} /></Field>
            <Field label="Check-out until"><TimeInput className={inputClass} value={hotel.checkOutTime} onChange={(e) => setHotel({ ...hotel, checkOutTime: e.target.value })} /></Field>
            <div className="sm:col-span-2">
              <ChipInput label="House rules" value={policies} onChange={setPolicies}
                suggestions={homestay ? ["No smoking indoors", "No alcohol", "Modest dress in the village", "Families and couples only", "Quiet hours after 10 pm", "ID required at check-in"] : ["No smoking indoors", "No pets", "ID required at check-in", "Quiet hours after 10 pm"]} />
            </div>
          </div>
        )}

        {id === "calendar" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {([[true, "Yes, I'll connect my calendar", "Paste an iCal link from Airbnb, Booking.com or Google Calendar after GBBookings approves the property."],
              [false, "No, not at this time", "You can connect one later from Calendar sync on each room."]] as const).map(([value, label, text]) => (
              <label key={label} className={choiceClass(hotel.calendarSync === value)}>
                <input type="radio" name="calendar-sync" checked={hotel.calendarSync === value} onChange={() => setHotel({ ...hotel, calendarSync: value })} className="mt-1 size-4 accent-[#006F3C]" />
                <span><span className="block text-sm font-bold">{label}</span><span className="text-xs text-slate-500">{text}</span></span>
              </label>
            ))}
          </div>
        )}

        {id === "languages" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap gap-2">
              {STAFF_LANGUAGES.map((language) => {
                const on = hotel.languages.includes(language);
                return <button key={language} type="button" aria-pressed={on} onClick={() => setHotel({ ...hotel, languages: on ? hotel.languages.filter((item) => item !== language) : [...hotel.languages, language] })}
                  className={`min-h-11 rounded-full border px-3.5 text-sm font-semibold ${on ? "border-[#006F3C] bg-emerald-50 text-emerald-900" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}>{language}</button>;
              })}
            </div>
            <div className="mt-4"><ChipInput label="Other languages" value={hotel.languages.filter((item) => !STAFF_LANGUAGES.includes(item))}
              onChange={(others) => setHotel({ ...hotel, languages: [...hotel.languages.filter((item) => STAFF_LANGUAGES.includes(item)), ...others] })} suggestions={[]} /></div>
          </div>
        )}

        {id === "payments" && (
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold">Pay now, online <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Coming soon</span></p><p className="mt-1 text-xs leading-5 text-slate-500">Guests pay by card through Safepay when they book. GBBookings handles the payment and refunds, and pays you out.</p></div>
              <div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold">Pay on arrival</p><p className="mt-1 text-xs leading-5 text-slate-500">Guests pay you at the property. Choose below how they can pay there.</p></div>
            </div>
            <PaymentMethodsField value={stayInfo} onChange={setStayInfo} />
          </div>
        )}

        {id === "invoicing" && (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold">What name should be on the invoice?</p>
            {([["property", hotel.title || "The property name"], ["legal", "Legal company name (please specify)"]] as const).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="invoice-as" className="size-4 accent-[#006F3C]" checked={hotel.invoiceAs === value} onChange={() => setHotel({ ...hotel, invoiceAs: value })} />{label}</label>
            ))}
            {hotel.invoiceAs === "legal" && <input className={inputClass} maxLength={160} value={hotel.invoiceName} onChange={(e) => setHotel({ ...hotel, invoiceName: e.target.value })} placeholder="e.g. Shigar Hospitality (Pvt) Ltd" aria-label="Legal company name" />}
            <p className="text-xs text-slate-500">Invoices use the property's address. Your NTN and bank details are part of your business profile.</p>
          </div>
        )}

        {id === "howwork" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {([[false, "Request to book", "You confirm each Pay on arrival request within a day; it expires if you don't. Pay now bookings are always confirmed at once."],
                [true, "Instant confirmation", "Every booking is confirmed straight away, as on Booking.com. Keep your calendar up to date and close dates you can't take."]] as const).map(([value, label, text]) => (
                <label key={label} className={choiceClass(hotel.instantBook === value)}>
                  <input type="radio" name="instant-book" checked={hotel.instantBook === value} onChange={() => setHotel({ ...hotel, instantBook: value })} className="mt-1 size-4 accent-[#006F3C]" />
                  <span><span className="block text-sm font-bold">{label}</span><span className="text-xs leading-5 text-slate-500">{text}</span></span>
                </label>
              ))}
            </div>
            <dl className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
              <div><dt className="font-bold">Can I decide when I get bookings?</dt><dd className="text-slate-600">Yes. Keep your calendar up to date and close any dates you don't want bookings, including dates booked on other sites.</dd></div>
              <div><dt className="font-bold">When does my property go live?</dt><dd className="text-slate-600">After GBBookings checks it, usually within a day. You can pause it any time from your dashboard.</dd></div>
              <div><dt className="font-bold">What does it cost?</dt><dd className="text-slate-600">A commission on each completed booking, shown under every room price. Listing is free.</dd></div>
            </dl>
          </div>
        )}

        {id === "policies" && <div className="rounded-2xl border border-slate-200 bg-white p-5"><StayInfoFields value={stayInfo} onChange={setStayInfo} payments={false} /></div>}

        {id === "host" && <div className="rounded-2xl border border-slate-200 bg-white p-5"><HomestayHostFields value={host} onChange={setHost} onUploadingChange={setUploading} /></div>}

        {id === "rooms" && (
          <div className="space-y-3">
            {rooms.map((room, index) => editing === index ? (
              <RoomForm key={index} initial={{ ...room.input, photos: room.photos }} kind={homestay ? 'homestay' : 'hotel'} singleUnit={singleUnit} live={false} busy={false} submitLabel="Save" onCancel={() => setEditing(null)}
                onSubmit={(input, roomPhotos) => { setRooms(rooms.map((item, at) => (at === index ? { input, photos: roomPhotos } : item))); setEditing(null); }} />
            ) : (
              <article key={index} className="flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                {room.photos[0] ? <img src={room.photos[0].url} alt="" className="h-16 w-22 rounded-lg object-cover" />
                  : <span className="flex h-16 w-22 items-center justify-center rounded-lg bg-slate-100 text-slate-400"><ImageIcon className="size-5" /></span>}
                <div className="min-w-45 flex-1">
                  <p className="font-extrabold">{room.input.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {singleUnit ? "" : `${room.input.totalRooms} room${room.input.totalRooms === 1 ? "" : "s"} · `}
                    {[room.input.bedType, ...roomFacts(room.input)].join(" · ")} · {room.input.maxAdults} adult{room.input.maxAdults === 1 ? "" : "s"}, {room.input.maxChildren} {room.input.maxChildren === 1 ? "child" : "children"} · PKR {room.input.basePrice.toLocaleString()}/night
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" className={secondaryButton} onClick={() => setEditing(index)}>Edit</button>
                  <button type="button" className={secondaryButton} onClick={() => setRooms(rooms.filter((_, at) => at !== index))}>Remove</button>
                </div>
              </article>
            ))}
            {editing === "new" ? (
              <RoomForm initial={singleUnit ? entireHome : newRoom} kind={homestay ? 'homestay' : 'hotel'} singleUnit={singleUnit} live={false} busy={false} submitLabel={singleUnit ? "Save" : "Add this room"} onCancel={() => setEditing(null)}
                onSubmit={(input, roomPhotos) => { setRooms([...rooms, { input, photos: roomPhotos }]); setEditing(null); setError(""); }} />
            ) : !(singleUnit && rooms.length) && (
              <button type="button" className={`${secondaryButton} w-full border-dashed`} onClick={() => setEditing("new")}>
                <Plus className="size-4" />{singleUnit ? "Set up the place" : rooms.length ? "Add another room category" : "Add a room category"}
              </button>
            )}
          </div>
        )}

        {id === "rates" && (() => {
          const example = fromPrice ?? 0;
          const off = (percent: number) => Math.round(example * (100 - percent) / 100);
          const plan = (on: boolean, toggle: (on: boolean) => void, title: string, text: string, percent: number, setPercent: (value: number) => void) => (
            <div className={`rounded-xl border p-4 ${on ? "border-[#006F3C] bg-emerald-50/40" : "border-slate-200"}`}>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" className="mt-1 size-4 accent-[#006F3C]" checked={on} onChange={(event) => toggle(event.target.checked)} />
                <span className="min-w-0 flex-1"><span className="block text-sm font-bold">{title}</span><span className="text-xs leading-5 text-slate-500">{text}</span></span>
              </label>
              {on && <div className="mt-3 flex flex-wrap items-center gap-2 pl-7 text-sm">
                <input type="number" min={1} max={50} aria-label={`${title} percent off`} value={percent} onChange={(event) => setPercent(Number(event.target.value))} className="min-h-11 w-20 rounded-lg border border-slate-300 px-3" />
                <span>% less than the standard rate{example > 0 && percent >= 1 && percent <= 50 ? ` · PKR ${off(percent).toLocaleString()} instead of PKR ${example.toLocaleString()} a night` : ""}</span>
              </div>}
            </div>
          );
          return (
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-bold">Standard rate plan</p>
                <p className="mt-1 text-sm text-slate-600">Your room prices as set{example > 0 ? `, from PKR ${example.toLocaleString()} a night` : ""}. Children stay free: room prices don't change with children.</p>
                <p className="mt-3 text-sm font-semibold text-slate-700">Cancellation policy <span className="font-normal text-slate-500">· for Pay now bookings, the whole property</span></p>
                <div className="mt-2 space-y-2">
                  {(["flexible", "moderate", "strict"] as const).map((key) => (
                    <label key={key} className={choiceClass(rates.policy === key)}>
                      <input type="radio" name="cancellation-policy" className="mt-1 size-4 accent-[#006F3C]" checked={rates.policy === key} onChange={() => setRates({ ...rates, policy: key })} />
                      <span><span className="block text-sm font-bold">{CANCELLATION_POLICIES[key].label}</span><span className="text-xs text-slate-500">{policyLines(key).join(". ")}.</span></span>
                    </label>
                  ))}
                </div>
              </div>
              {plan(rates.nonRefundable, (on) => setRates({ ...rates, nonRefundable: on }), "Non-refundable rate plan", "Guests pay less but can't cancel for a refund. Offered with Pay now only, so the money is paid when they book.", rates.nonRefundablePercent, (value) => setRates({ ...rates, nonRefundablePercent: value }))}
              {plan(rates.weekly, (on) => setRates({ ...rates, weekly: on }), "Weekly rate plan", "Guests who stay 7 nights or more pay less. Same cancellation policy as the standard rate.", rates.weeklyPercent, (value) => setRates({ ...rates, weeklyPercent: value }))}
              {plan(rates.singleGuest, (on) => setRates({ ...rates, singleGuest: on }), "Price for one guest", "A room booked for one person costs less than for two.", rates.singleGuestPercent, (value) => setRates({ ...rates, singleGuestPercent: value }))}
            </div>
          );
        })()}

        {id === "photos" && <div className="rounded-2xl border border-slate-200 bg-white p-5"><PhotoManager photos={photos} onChange={setPhotos} max={20} min={MIN_PHOTOS} qualityCheck label="Property photos" onUploadingChange={setUploading} /></div>}

        {id === "business" && registration?.(() => void finish(true))}

        <div className="flex gap-3">
          {step > 0 && <button type="button" aria-label="Back" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#006F3C] bg-white text-[#006F3C] hover:bg-emerald-50" onClick={() => go(step - 1)}><ChevronLeft className="size-5" /></button>}
          {!last ? (
            <button type="button" className={`${primaryButton} flex-1`} disabled={uploading} onClick={() => go(step + 1)}>Continue</button>
          ) : busy && <p className="flex items-center gap-2 text-sm text-slate-600"><LoaderCircle className="size-4 animate-spin" />Submitting your {noun}…</p>}
        </div>
        </div>
        </>}
      </div>

      {!hub && TIPS[id] && (
        <aside aria-label="Tip" className="mt-14 hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:block">
          <p className="flex items-start gap-2 text-sm font-bold text-slate-900"><Lightbulb className="mt-0.5 size-4 shrink-0 text-[#006F3C]" aria-hidden="true" />{TIPS[id]![0]}</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{TIPS[id]![1]}</p>
        </aside>
      )}
      {hub && <aside aria-label="Guest preview" className="hidden w-80 shrink-0 space-y-2.5 xl:block">
        <p className="text-xs font-bold tracking-[0.12em] text-slate-500">How guests will see it</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {photos[0] ? <img src={photos[0].url} alt={photos[0].caption || "Cover photo"} className="h-44 w-full object-cover" />
            : <div className="flex h-44 items-center justify-center bg-slate-100 text-sm text-slate-500">Cover photo</div>}
          <div className="space-y-2.5 p-4">
            <div>
              <p className="text-[17px] font-extrabold">{hotel.title || "Your property name"}</p>
              <p className="mt-0.5 text-sm text-slate-500">{singleUnit ? `Entire ${noun}` : hotel.hotelType} · {addressLine(address) || "Address"}</p>
            </div>
            {homestay && host.hostName && <p className="text-sm text-slate-600">Hosted by <strong>{host.hostName}</strong></p>}
            {fromPrice !== null && <p className="text-sm"><span className="text-slate-500">from</span> <strong>PKR {fromPrice.toLocaleString()}</strong> <span className="text-slate-500">/ night</span></p>}
            {rooms.length > 0 && !singleUnit && (
              <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
                {rooms.map((room, index) => <li key={index} className="flex justify-between gap-3 py-2"><span className="truncate">{room.input.name}</span><strong>{room.input.basePrice.toLocaleString()}</strong></li>)}
              </ul>
            )}
          </div>
        </div>
      </aside>}
    </div>
  );
}
