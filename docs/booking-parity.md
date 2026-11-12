# Booking.com parity audit

Started 2026-11-11. This document compares Booking.com's pages and journeys with GBBookings and records what users can find and do on each page. It builds on [SRS-Audit-2026-11-10.md](SRS-Audit-2026-11-10.md) and the IDs in [../todo.md](../todo.md). It does not repeat their acceptance criteria.

**Status**
- **Verified**: exercised in the running app during this audit. The evidence column says how.
- **Partial**: built, but either it is missing some of what Booking.com offers or it has not been exercised yet. The "Missing" column says which.
- **Missing**: not built.
- **Blocked**: needs access, a provider, or an owner decision. The blocker is named.

**Scope rules (owner decisions, not gaps):** Pakistan only, so there is no currency switcher, foreign locales or per-country tax. English and Urdu only. Verticals are built in the order Hotels, Homestays, Tours, Cars. Only free services are used.

## Reference map (Booking.com, inspected 2026-11-11)

| Area | Reference | What is there | How inspected |
|---|---|---|---|
| Header | `booking.com/` | Logo, currency (PKR), language, Customer support, List your property, Register, Sign in. Tabs: Stays, Flights, Car rental, Activities, Transfers | Browser, signed out at first; the browser then showed the owner's own signed-in session, which was not used |
| Homepage | `/index.html` | Search bar (destination, date range, occupancy with adults, children and rooms, "travelling for work"), Offers (Late Escape, seasonal), Trending destinations, Genius sign-in banner, "Popular with travellers from Pakistan" link lists | Browser |
| Footer | all pages | Support (Manage your trips, Contact, Safety centre), Discover (Genius, Seasonal deals, Articles, Business, Awards, Car rental, Flight finder, Travel agents), Terms and settings (Privacy, Terms, Accessibility, Partner dispute), Partners (Extranet login, Partner help, List your property, Affiliate), About (About, How we work, Sustainability, Press, Careers). Destination indexes: countries, regions, cities, districts, airports, hotels, landmarks. Property-type pages: homes, apartments, resorts, villas, hostels, B&Bs, guest houses | Browser, link list read from the DOM |
| Destination autocomplete | search bar | Suggestions with type icons (city, airport, property) and region | Browser: typed "Skardu" |
| Search results | `/searchresults.html?dest_id=…&checkin=…&checkout=…&group_adults=…&no_rooms=…` | Breadcrumb, "Show on map", "N properties found", list or grid view, Sort. Filters with counts: budget per night, review score, property type, bedrooms and bathrooms, facilities, room facilities, distance from centre, star rating, bed preference, meals, reservation policy (free cancellation, no prepayment), accessibility. Card: name, distance from downtown, score with word and count, recommended room and beds, free cancellation, "pay at the property", "only N left", "1 night, 2 adults", struck-through price and current total "Includes taxes and fees", "See availability" | Browser: Skardu, 63 results |
| Property page | `/hotel/pk/<slug>.html?checkin=…` | Section tabs (Overview, Info & prices, Facilities, Property policies, Important info, Reviews). Highlights, About, popular facilities, availability table (room type, guests, "price for 2 nights", your choices, number of rooms, "I'll reserve"), guest reviews by category, area info and restaurants, child and extra-bed policies, fine print | Browser, with dates carried from search |
| Reservation | "I'll reserve", then Your details, then Final step | Not opened: with the owner's account signed in, the form would be pre-filled with their personal data. Steps are taken from the public flow | **Needs a signed-out session or test access** |
| Manage booking, Genius, partner extranet | `secure.booking.com/…`, `admin.booking.com` | Need an account with a booking, or a partner login | **Needs access**. Partner flows are taken from the SRS audit's earlier comparison |

## Parity table

The route column is the matching page in this app. Listings live at `/listing/:id` and checkout at `/listing/:id/checkout`.

### Accommodation journey (done first)

| Feature | Booking.com | GBBookings route | Status | Missing / next | Dependencies | Evidence |
|---|---|---|---|---|---|---|
| Search keeps dates and guests after a refresh or Back | URL carries `checkin`, `checkout`, `group_adults` | `/search?type=hotel` | **Verified** | Dates and guests are not in the URL yet, so a shared link loses them (FR-GST-03) | none | Picked 20–22 Nov with 2 guests, reloaded: dates and the "free rooms for 2 guests" filter came back. Stored per tab in `gb.stay` ([lastStay.ts](../src/shared/utils/lastStay.ts)). **Built this session** |
| Property page opens with the searched dates and party | Property URL carries the dates; the room table is already priced | `/listing/:id` | **Verified** | — | none | Opened Hunza Valley Mountain Resort from the results: the panel showed 20 Nov–22 Nov, 2 adults, and a live quote of PKR 57,000 for Standard Room. **Built this session** |
| Result card shows the stay total | "1 night, 2 adults · PKR X · Includes taxes and fees" | `/search` | **Verified** | Struck-through "was" price for deals. Totals only for parties that fit in one room | none | Cards show "PKR 19,200 for 2 nights, includes fees and taxes". The API quote for the same room returned `totalPrice` 19,200 (17,000 room + 1,700 service charge + 500 cleaning). Both use `staySubtotalMinor` in [room-price.ts](../server/modules/bookings/room-price.ts). **Built this session** (SRCH-16) |
| Destination autocomplete | Typed suggestions with type icons | `/search` | Partial | Exercise in browser. Has place names only, no property or landmark suggestions | none | Built 2026-11-05 (SRCH-01) |
| Filters | See reference map | `/search` sidebar | Partial | No counts per option (SRCH-15). Facilities is a typed list, not checkboxes (SRCH-10). No distance from centre (SRCH-13), bed preference, accessibility (SRCH-20) or review-score bands (only a minimum rating) | Distance needs map pins on all listings ("Needs you" in todo) | Code: [ListingsSearch.tsx](../src/features/catalog/ListingsSearch.tsx). Free cancellation, breakfast, stars, who can stay, price and rating exist |
| Sort | Top picks, price, rating, distance | `/search` | Partial | Distance sort | Map pins | Recommended, price low and high, and rating exist |
| Map view | "Show on map" | `/search` Map tab | Partial | Exercise in browser. 3 of 4 live hotels have no pin | Partners add pins | Built 2026-11-05 (SRCH-14) |
| Empty results | "0 properties", suggestions | `/search` | Partial | Exercise with no-match dates | none | Code shows "Try other dates, a higher price, or a lower rating" |
| Property gallery, about, facilities, location map, policies, reviews | Sections as in the reference | `/listing/:id` | Partial | Section tabs, nearby places (LST-08), Q&A (LST-10), FAQs (LST-11), similar properties (LST-17), review filters and sort (REV-07) | none | Page seen in browser: "What this place offers" and "Where you'll be" with an OSM map |
| Rooms and rates table | Several room types, each with a room count | Booking panel | Partial | Several room types in one booking (LST-05). Rate plans (LST-04) | **Owner decision** (both in todo §5) | Panel lists every room with availability, "N left", free cancellation, meals and total |
| Unavailable inventory | Sold-out rooms greyed out | Booking panel | **Verified** | — | none | Booking took the room count from 14 to 13, and cancelling it put it back to 14 (API, the same call the panel makes). Booked-out nights are greyed in the date picker |
| Reservation: guest details, price breakdown | Your details, then Final step | `/listing/:id/checkout` | **Verified** | Booking for someone else (BKG-08), marketing consent (BKG-13) | none | Browser: Reserve opened checkout with the same PKR 57,000. An empty phone was blocked with "This field is required". Review showed guest, stay, room, promo code, and Pay now or Pay on arrival. Double-clicking "Request reservation" created one booking |
| Duplicate submission | One reservation per click | `POST /api/v1/bookings` | **Verified** | — | none | Two simultaneous POSTs with the same Idempotency-Key gave 201 and 200 with the same booking ID |
| Price changed between quote and submit | Re-quote | `POST /api/v1/bookings` | **Verified** | — | none | A submit with a stale total returned 409 `PRICE_CHANGED` |
| Payment | Card, or pay at the property | Checkout | Partial | Live Safepay keys (PAY-01). Wallets (PAY-02) | **Safepay live approval**. Sandbox works | Pay on arrival created a booking in this audit. Pay now goes through the Safepay sandbox |
| Confirmation | Confirmation page and email with number and PIN | Checkout step 3, `/bookings` | Partial | Confirmation email not checked (needs a real inbox). PIN for signed-out lookup (BKG-12) | Email sending configured | Browser: "Request sent — your room is held" with reference GB-9B5D5A48, "Awaiting confirmation" and the expiry time |
| Manage booking: view, change dates, edit details, cancel | Manage your trips | `/bookings` | Partial | View and cancel **Verified**. Edit details and Request a change still to exercise. Request invoice (MNG-07) | none | Browser: the card listed View voucher, Message partner, Edit details, Request a change, Get help and Cancel booking. Cancelling through the in-page dialog moved it to the Cancelled tab. The API also showed inventory released | [ChangeBookingDialog.tsx](../src/features/account/ChangeBookingDialog.tsx), [EditBookingDialog.tsx](../src/features/account/EditBookingDialog.tsx) |
| Booking lookup without signing in | Confirmation number + PIN | — | Missing | Depends on guest checkout, which is "not now" (AUTH-15). All bookings have an account | Owner decision | todo §8 |

### Discovery and navigation

| Feature | Booking.com | GBBookings route | Status | Missing / next | Dependencies | Evidence |
|---|---|---|---|---|---|---|
| Homepage search and tabs | Stays, Flights, Cars, Activities, Transfers | `/` | Partial | Exercise the hero search end to end | none | Seen in browser: Hotels, Homestays, Cars and Tours tabs, dates, guests, Search |
| Accommodation categories | Hotels, homes, apartments, resorts, hostels, B&Bs pages | `/hotels`, `/homestays`, `/stays/<type>` for all 16 types | **Verified** | Listings with no property type set appear on every type page (the existing category rule). Partners setting a type fixes it | none | **Built 2026-11-11.** Browser: the footer "Property types" row (16 links) opened `/stays/resort` with heading "Resorts", the type filter preset and 1 result. `/stays/homestay` opened directly showed 3. An unknown slug falls back to the homepage. Crawler HTML: 200 with the same listings, 404 noindex for unknown types, all 16 in the sitemap |
| Destination pages | City, region and landmark pages | `/destinations`, `/place/<town>` | **Verified** | Landmark pages. The Destinations guides still open search, not the town page | none | **Built 2026-11-11** (FR-GST-06). Browser: footer "Hunza Valley" opened the town page with a cover photo and Hotels (1), Homestays (2) and Tours (1). Sections with nothing are hidden. "See all homestays" opened search with the same 2. It survives a refresh. Deosai Plains shows "Nothing listed in Deosai Plains yet". Crawler HTML: 200 with listings, 404 noindex when empty. Only towns with listings go in the sitemap |
| Deals | Late Escape, seasonal deals | `/offers` | Blocked | The page shows demo codes. **Owner decision**: link it to real partner promo codes or remove it (todo §3) | Owner | |
| Language and currency | Switchers in the header | Header: PKR, English and Urdu | **Out of scope** | Currency is fixed at PKR by decision. No more languages (UX-01 not wanted) | — | Seen in browser |
| Header and footer destinations | See reference map | Header, footer | Partial | Articles, careers, press and affiliate pages are not planned. Exercise every footer link in one pass | none | Footer has support, legal pages, become a partner, and now About, the town pages and the property-type row |
| About us / How we work | `/content/about.html`, `/content/how_we_work.html` | `/about` | **Verified** | — | none | **Built 2026-11-11.** Footer "About Us" opened it (it used to open Support). Back returns. Covers what GBBookings is, how partners are checked, payment choices, road-closure help, how we earn and the order of listings |
| Crawler pages (all public pages) | Server-rendered | `server/modules/seo` | **Verified** | — | Vercel rewrites (added for `/place` and `/stays`) | **Fixed 2026-11-11:** the built `index.html` has its script in `<head>`, so page content was never inserted and Google saw "Loading…" on `/listing/:id`, `/hotels` and the others. Checked with a throwaway local server: `/hotels` now has 4 listings in its HTML |
| Recently viewed, recent searches | Shown on the homepage | — | Missing | SRCH-18 | none | |

### Traveller accounts

| Feature | Booking.com | GBBookings route | Status | Missing / next | Dependencies | Evidence |
|---|---|---|---|---|---|---|
| Register, sign in, recovery | Account pages | Auth dialog, `/verify-email`, `/reset-password` | Partial | Exercise. Account enumeration on register (SEC-14) | Email | Signed in during this audit |
| Profile | Personal details, preferences | `/profile` | Partial | DOB, nationality and CNIC (PRO-02). Photo (PRO-03). Companions (PRO-04) | none | |
| Saved properties | Lists, shareable | `/saved` | Partial | Multiple and shareable lists (PRO-06) | none | |
| Trips | Upcoming and past | `/bookings` | Partial | Exercise | none | |
| Rewards (Genius) | Levels, discounts | — | Missing | PRO-10, in the "later" group | Owner priority | |
| Notifications | Inbox and notification centre | `/inbox` | Partial | Notification centre (MSG-10). Realtime needs Inngest. Without it the inbox polls | Inngest keys on Vercel | Server log shows the polling fallback |
| Support | Help centre, contact, per-booking help | `/support`, booking "Get help" | Partial | Real support phone (SUP-02) | Owner | |

### Other travel products

| Product | Booking.com | GBBookings route | Status | Missing / next | Dependencies |
|---|---|---|---|---|---|
| Flights | `booking.com/pxgo` | — | Blocked | Needs a flight inventory and ticketing provider (a GDS or aggregator), which is not free and not in the phase plan | Provider contract, owner decision |
| Car rental | `/cars/index.html` | `/cars`, `/search?type=car` | Partial | Handover inspection (CAR-11), route fares (FR-CAR-01). Phase 4 in the plan | none |
| Activities | `/attractions/index.html` | `/tours`, `/search?type=tour` | Partial | Time slots (TOUR-02), ticket types (TOUR-03), seats per departure (TOUR-09) | none |
| Airport taxis | `/taxi/index.html` | Cars with a driver, one-way | Partial | No point-to-point taxi booking (pickup and drop-off address with a fixed fare). Closest is the route fare table (FR-CAR-01) | none |

### Property partners (inspected 2026-11-11)

**Booking.com reference.** The `join.booking.com` landing page was inspected in the browser. It has: Register for free, Continue your registration, Sign in, Request to Book or instant booking, house rules, pre-booking messages, liability and damage protection, Payments by Booking.com (payout timing), importing a listing and its reviews from other sites, calendar sync, a "New to Booking.com" label, FAQ, Extranet and Pulse app links. "Register for free" creates a Booking.com partner account, which this audit may not do. The registration wizard after sign-up is therefore compared from the SRS audit's JOIN-xx items: property type, "You're listing…", name, address and **required** pin, facilities, breakfast and parking, languages, house rules, rooms, **5 or more photos**, **price and rate plans**, **cancellation policy**, **open from date and calendar sync**, invoicing details, then open now or later.

**Booking.com registration, walked 2026-11-11.** The owner opened a registration in their own partner account and asked for each page to be walked with test data and not submitted. Test property: "Parity Test Hotel Skardu", Airport Road, Gamba, Skardu 16200. It is left as an unsubmitted draft in that account. The flow is a hub of four steps, each with Edit, and the Final steps stay locked until Units is done:

| # | Booking.com page | What it asks | GBBookings equivalent | Gap |
|---|---|---|---|---|
| 1.1 | Where is your property? | Google address search, or enter it manually; apartment or floor; country; city; zip; pin with "update the address by moving the pin" | Steps 5–6 (address, optional pin) | Their pin is always set. Bug seen on theirs: choosing a suggestion cleared the country, and the pin option rewrote typed fields |
| 1.2 | Connect to a channel manager | Yes or No | Calendar sync (iCal) after listing | No channel-manager API (not needed at this size) |
| 1.3 | Tell us about your hotel | Name, star rating (N/A to 5), part of a group or chain? | Steps 1–4 | Chain or management company (JOIN-13) |
| 1.4 | What can guests use? | 19 facility checkboxes; more later in the Extranet | Step 7, 23 checkboxes | — |
| 1.5 | Services | Breakfast: included or extra, plus 13 types (Halal…). Parking: free or paid, reservation, on or off site, private or public | Step 8 | Breakfast types, private or public parking |
| 1.6 | Languages | Staff languages | — (homestays only, JOIN-20) | Missing for hotels |
| 1.7 | House Rules | Check-in from and until, check-out from and until, children, pets (yes, on request, no) | Steps 9–10 | Time windows (JOIN-21). "Pets on request" |
| 2.1 | Room details | Unit type (12), number of rooms, beds by size, guests (exclude infants), size, **smoking per room** | Step 11 room form | Smoking per room (JOIN-29) |
| 2.2 | Bathroom details | Private or shared, 10 items | Room form | — |
| 2.3 | Room amenities | **Checklist** in 3 groups. "View" asks the main view (10 choices) | Free-text chips | JOIN-28 checklist and view type |
| 2.4 | Room name | **Standard names only** (about 70, from type and view); a custom name is internal | Free text | Standard names make rooms comparable and translatable |
| 2.5 | Price per night | PKR, "including taxes, commission and fees", 12% commission and "your earnings PKR 7,920" | "You earn PKR 8,820 after the 2% commission" | — |
| 2.6 | **Rate plans** (pre-filled) | Standard with **price by group size** (1 guest 10% less). Cancellation: free until 6 pm on arrival day, then first night; free within 24 h of booking. **Children stay free** (badge). **Non-refundable 10% less**. **Weekly 15% less** for 7+ nights | Not in the wizard. Length-of-stay deals after listing (PAY-09). Policy defaults to moderate | **LST-04 rate plans, PAY-10 price per guest count, cancellation in the wizard** |
| 3 | Photos | At least **5**, jpg or png up to 47 MB, tips, permission note. Continue with none returns to the hub unfinished. With uploads: "choose a main photo", drag to reorder, remove (✕), "upload at least 1 more photo to continue". **Plain single-colour test images were silently dropped**, while a textured one was accepted, so there is a photo-quality check | Step 12, at least 1, no quality check | JOIN-37 (minimum 5 and a quality check) |
| 4.1 | Payments | Online through Payments by Booking.com (monthly payout) or **card at the property** | Pay now (Safepay) or Pay on arrival (cash, card, wallets) | — (ours fits Pakistan better) |
| 4.2 | Invoicing | Name on invoice: account name, property or legal company; recipient address | Business details step (NTN optional) | — |
| 4.3 | Partner verification | Individual or business. Business: legal name, address, "trading as", **name and date of birth of everyone owning 25% or more** | Business step: CNIC, documents, admin review | Ownership over 25% (not needed for Pakistan law yet) |
| 4.4 | Some important info | Bookings are confirmed instantly. The partner **cannot accept or decline**; any open date is bookable. Control is by closing dates on the calendar | Pay on arrival requests wait for the partner unless instant booking is on (BKG-02) | — (ours is a deliberate choice) |
| Hub | Complete registration | With all 4 steps ticked, the hub shows "Complete registration". **Not pressed, by instruction.** No bank-details page appeared, because the payment option was "card at the property"; choosing "online" would add payout bank details | Submit for admin review | — |

Placeholder data was used for verification ("Parity Test Hotel (Test Entity)", owner "Test Owner", 01/01/1990), at the owner's request. Photos: 5 generated test images, of which 1 was kept; 4 real photos were already in the draft from an earlier attempt. The owner should delete this draft in the Booking.com account.

**GBBookings.** The Add hotel wizard was walked in the browser as the signed-in hotel partner, through steps 1–12 of 13, with test data ("Parity Test Hotel"). The test draft was discarded afterwards.

| Feature | Booking.com | GBBookings route | Status | Missing / next | Evidence |
|---|---|---|---|---|---|
| Partner landing | `join.booking.com` | `/become-partner` | **Verified** | Liability or damage cover, import from other sites (ONB-08), "New" search label | Browser: four partner types with the documents each needs, How it works, What you'll need, contact. For an existing hotel partner it shows "Open partner dashboard" and refuses other types for this account (ONB-07 is still open) |
| New partner registration | Account first, then the wizard | Wizard, then business details as the last step | Partial | Not walked: it needs a fresh test account, which can be made on localhost | Code: [AddHotelWizard.tsx](../src/features/vendor/AddHotelWizard.tsx) `registration` prop |
| Wizard: type, how many, "You're listing" | Same | Dashboard → Add hotel, steps 1–3 | **Verified** | — | Browser: 10 hotel types. "One hotel" or "Several hotels". "Does this sound like your property? … One hotel where guests book a room". JOIN-05 and JOIN-06 in todo.md are further along than listed there |
| Wizard: name and description | Same | Step 4 | **Verified** | — | An empty name was blocked: "Add the name of your property." |
| Wizard: address and pin | Pin required | Steps 5–6 | Partial | **The pin is optional**, which is why 3 of 4 live hotels have none. Making it required needs **your decision** | Empty address blocked: "Add the street or village and the town." Pin step uses OSM with "Use my current location" |
| Wizard: facilities, breakfast, parking | Same | Steps 7–8 | **Verified** | Languages spoken (JOIN-20, homestays only) | 23 facility checkboxes, breakfast yes or no, free, paid or no parking, on-site, reservation needed |
| Wizard: house rules, check-in | Times, parties, pets, smoking | Steps 9–10 | **Verified** | Check-in as a time window (JOIN-21), parties rule (JOIN-22) | Check-in from and check-out by, rule chips, children, minimum age, pets, smoking, who can stay, extra bed price, payment methods at the property, mountain essentials (power backup, heating, hot water) |
| Wizard: rooms | Bed types, guests, size, bathroom, amenities | Step 11 | **Verified** | — | Type, name, number of rooms, price with "You earn PKR 8,820 after the 2% commission", adults and children, beds, private or shared bathroom, bathroom items, size, amenities, description, up to 10 photos. **Fixed this session**: pressing Continue with a room still open now says "Press Add this room to keep this room, or Cancel." (before, Continue was silently disabled under a stale "Add at least one room category"). Also fixed "1 children" to "1 child" |
| Wizard: photos | 5 or more, quality checks | Step 12 | Partial | Requires 1 photo, not 5 (JOIN-37). Upload and submit (step 13) not walked, because uploads go to the live Cloudinary account | Empty photos blocked: "Add at least one photo." |
| Wizard: pricing and rate plans | Price, non-refundable plan, weekly rate | Price per room in step 11 | Partial | Rate plans (LST-04, **owner decision**). Weekly and length-of-stay deals exist after listing (PAY-09) | |
| Wizard: cancellation policy | Asked during registration | Not in the wizard | Partial | Defaults to "moderate". Set later in Policies & fees. Consider asking it in the wizard | Code: no `cancellationPolicy` in [AddHotelWizard.tsx](../src/features/vendor/AddHotelWizard.tsx) |
| Wizard: open from date, calendar sync | Asked at the end | — | Missing | JOIN-35 open from date. JOIN-43 open now or later (goes live when the admin approves). Calendar sync exists after listing | |
| Save and resume | "Continue your registration" | "Save and exit", "Saved 20:53" | **Verified** | — | Every step saved a draft on the server. Discard asks in an in-app dialog and deletes it |
| Extranet home | Home with today's arrivals and departures, messages | Dashboard → Home | **Verified** | — | Browser: requests waiting, arriving today, tonight's occupancy, month revenue, needs your answer, arriving, in house, leaving, next 14 days |
| Extranet sections | Rates & availability, Promotions, Reservations, Property, Inbox, Reviews, Finance, Analytics | Home, Reservations, Messages, Hotels & rooms, Guest reviews, Promo codes, Reports, Payouts, Team, Business profile | Partial | Exercise each section. One grid for all rooms by date (FR-HTL-06). A link for each reservation (FR-PRT-04). Commission-owed page (FR-PRT-01) | Sidebar seen in browser |
| Calendar sync (iCal) | Import and export | Hotels & rooms → Calendar sync | Partial | Test with a real Airbnb or Google link (todo §2) | |

## Checks run this session

- `npm run lint` (`tsc --noEmit`): pass
- `npm run build` (Vite and esbuild): pass
- Browser: search, refresh, open listing, prefilled quote. Desktop only, because the browser window could not be resized to phone width. **Mobile check still to do.**
- API, as the signed-in user: duplicate submit, stale price, cancel, inventory restored.
- Browser checkout with Pay on arrival through confirmation, then cancel from `/bookings`. The test guest was "Parity Test Guest" with `parity-guest@example.test`. Both test bookings (GB-FABF1EE2, GB-9B5D5A48) are cancelled.

## Next step for a new session

1. On `/bookings`, exercise Edit details and Request a change. Then repeat the whole journey at phone width (about 390px; use DevTools device mode, since the automation window would not resize).
2. Put the search criteria in the `/search` URL (FR-GST-03) so links can be shared. `urlForView` in [App.tsx](../src/app/App.tsx) is the one place to change.
3. Filter counts (SRCH-15), then facility checkboxes (SRCH-10).
4. Partner: walk new-partner registration with a fresh localhost test account, recording its credentials in the seed or example config and not in chat. Finish the wizard's photos and submit with a test image, then approve it in the admin and check that it appears in search.
5. Partner, needs the owner: require the map pin? Require 5 photos? Ask the cancellation policy in the wizard? Each is a one-step change once decided.
