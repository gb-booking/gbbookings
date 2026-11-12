# GBBookings to-do

Open work is listed in sections 1 to 8 and in section 11 (the 2026-11-10 code audit). Section 10 lists what was built on 2026-11-05. Older finished items remain in git history.
Priorities come from the owner's notes. IDs match docs/SRS-GBBookings-vs-Booking.com.pdf.

Test sheet: https://claude.ai/artifact/Mb68jpQo5rsJFxMHYcB9Sk

# 1. Fix first: from the latest test round

- [ ] **Booking.com comparison (E-06, rated 4/10, no note).** Say what felt harder or less trustworthy.
- [ ] **Your domain can't receive email.** `gbbookings.com` has no mail servers set up, so mail to `info@gbbookings.com` (shown on the site and in the footer) won't arrive. Set up mailboxes or forwarding for the domain.

# 2. To test: built 2026-11-05

Server flows passed on a throwaway database. The screens have not been opened in a browser.

- [ ] No-shows and disputes (N-01 to N-06), stays completing by themselves (B-18).
- [ ] Booking limits and review rules (B-16, B-17, R-01), paying twice (Y-06).
- [ ] All bookings list and CSV export (D-06, D-07).
- [ ] Calendar sync (K-01 to K-05), with a real Airbnb or Google Calendar link.
- [ ] Payment in its own tab, including a real payment (Y-01, Y-02), sign-in reloading the page (A-01, A-02), newsletter typos (P-11).
- [ ] Admin sign-in code, new-device email, change email, reception staff, real-file upload checks, contact details in listings (T-01 to T-07).
- [ ] OpenStreetMap, map view, free cancellation and hotel class filters, place suggestions, star rating (S-01 to S-05).
- [ ] Stay rules, automatic deals, instant confirmation, price by date range, arrival time, children's ages, edit details (R-01 to R-07).
- [ ] Partner Messages tab, Get help on a booking, reporting a chat, admin Support page (U-01 to U-04). The partner tab and the admin page have not been opened in a browser yet.
- [ ] Car pickup places, driver age, paid extras, mileage; review wording for cars and tours (C-01 to C-05).

# 3. Needs you

- [ ] **Free Gemini key** — `GEMINI_API_KEY` is still empty, so the trip assistant has never answered and the CNIC reading is off. Set it from Google AI Studio, then test P-12 and D-04, and confirm `GEMINI_MODEL` works.
- [ ] **More details from car and tour partners** — O-04 and O-05 asked for them. Say which fields.
- [ ] **Offers page** — link it to real partner promo codes, or remove it. Its demo codes still say coming soon.
- [ ] **Real support phone and WhatsApp** — `VITE_SUPPORT_PHONE` is `+923008888888`, which looks like a placeholder (SUP-02).
- [ ] **PayFast checklist** — full office address, a real phone number, at least 7–8 live listings, then reply "Acknowledge" to PayFast.
- [ ] **Urdu wording** — have an Urdu speaker read it.
- [ ] **Lawyer and accountant** — a lawyer reads the Partner Agreement; an accountant confirms which taxes to set in Admin > Fees & refunds (none set yet).
- [ ] **Map pins on older hotels** — 3 of the 4 live hotels have no map pin, so they don't appear in map view, and their listing map is only a rough lookup from the address. Add pins from the partner side.
- [ ] **On Vercel: settings** — set `APP_URL`, leave `INNGEST_DEV` unset, and leave `MEDIA_MAX_FILE_MB` unset (it would otherwise go over Vercel's upload limit). The site now refuses to start in production without `APP_URL`, or with `INNGEST_DEV`.
- [ ] **CNIC reading with Gemini** — it is now off by default (`CNIC_AI_CHECK=false`), because free plans may use data to improve Google's products. Turn it on only with a paid plan, and say so in the Privacy page.
- [ ] **Refunds recorded before the queue existed** have no entry. Any real ones need paying from the Safepay dashboard.

# 4. Before launch

## Going live
- [ ] **PAY-01** Live Safepay keys and webhook, after Safepay approves the account.
- [ ] **NFR-06** Confirm MongoDB Atlas backups and do one restore test.
- [ ] **Inngest on Vercel** — free account; set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` on Vercel; register `<site>/api/inngest`. Until then scheduled jobs do not run there and the inbox polls.
- [ ] **Check on Vercel** — `/sitemap.xml`, `/robots.txt`, `/listing/<id>` and `/api/inngest` have only run locally.

# 5. Build next: marked important

## Rooms, pricing and booking
- [x] **LST-04** Rate plans: built 2026-11-12, as on Booking.com. Non-refundable (Pay now only, no refund), price for one guest, weekly (the long-stay deal) and the cancellation policy are set on a Rate plans page in the add-property flow and in Policies & fees. Guests choose the rate on the listing page. To test with a real Pay now booking.
- [ ] **LST-05** Several room types in one booking, each with its own quantity (partial: one room type per booking) – Decision first: one booking would hold several rooms, which touches changes, cancellations, refunds, statements and calendar sync.

## Payments and invoices
- [ ] **PAY-02** Local wallets (JazzCash, Easypaisa) online – Needs you: ask Safepay whether wallets can be switched on for the account. Their payment page already handles the choice, so little or no code.
- [ ] **PAY-14** Invoices (guest tax invoice, partner commission invoice) (partial: Printable voucher / receipt only) – Needs you: the accountant's required layout and your tax number (NTN). Partner statements already serve as the commission invoice.

## Partners
- [ ] **ONB-02** Identity / business verification (partial: Manual admin review + AI CNIC pre-check; no NADRA Verisys) – Set GEMINI_API_KEY and test on a real CNIC; Verisys later.

# 6. Later: wanted, after section 5

Marked important by the owner, in the later group of the plan.

## Security
- [x] **SEC-02** CSRF protection: already in place. The server refuses every request, including state-changing ones, whose Origin header is not the site's own (`app.ts` CORS check), on top of SameSite=Lax cookies. No CSRF token is needed for this JSON API.
- [ ] **SEC-12** Fraud / risky-booking checks
- [ ] **SEC-14** Account enumeration (partial: Login and reset are generic; register says "account already exists")
- [ ] **SEC-15** Lockout abuse (someone locks a victim out) (partial: Anyone knowing an email can lock it for 15 minutes) – Lock per email+IP, or require CAPTCHA after 3 failures instead of locking.

## Guest profile
- [ ] **PRO-02** Extra personal details (DOB, nationality, address, CNIC/passport)
- [ ] **PRO-03** Profile photo
- [ ] **PRO-04** Saved travellers / companions
- [ ] **PRO-05** Saved payment methods – Needs Safepay card tokenisation.
- [ ] **PRO-06** Wishlist (partial: One list on its own Saved stays page, not shareable)
- [ ] **PRO-07** Language preference (partial: English / Urdu (RTL), saved in the browser only)
- [ ] **PRO-10** Loyalty programme (Genius-style)
- [ ] **PRO-11** Wallet / travel credits
- [ ] **PRO-12** "My reviews" page
- [ ] **PRO-13** Accessibility preferences

## Search
- [ ] **SRCH-05** Flexible dates
- [ ] **SRCH-09** Property type filter (partial: Category substring (hotel type / car type))
- [ ] **SRCH-12** Meal plan filter (partial: Breakfast only)
- [ ] **SRCH-15** Filter result counts
- [ ] **SRCH-17** Scarcity signals ("Only 2 left") (partial: shown in the booking panels, not on search result cards)
- [ ] **SRCH-18** Recent searches / recently viewed
- [ ] **SRCH-20** Accessibility filter

## Listing page
- [ ] **LST-08** Nearby places and distances
- [ ] **LST-10** Guest questions & answers
- [ ] **LST-11** Property FAQs
- [ ] **LST-16** Accessibility features
- [ ] **LST-17** Similar / recommended properties

## Booking and payments
- [ ] **BKG-08** Booking for someone else / work trip flag (partial: Guest details can differ from the account; no explicit option)
- [ ] **BKG-11** Add-ons / cross-sell (car, taxi, tour) after booking
- [ ] **BKG-12** Confirmation number + PIN (partial: Reference only (sign-in needed to manage))
- [ ] **BKG-13** Marketing consent at checkout
- [ ] **PAY-10** Price per number of guests
- [ ] **PAY-15** Deposit / partial prepayment
- [ ] **PAY-16** Saved cards
- [x] **MNG-06** Add to calendar (.ics): a button on confirmed upcoming bookings saves the trip as a calendar file. To test on screen.
- [ ] **MNG-07** Request invoice
- [x] **MNG-12** Book again: a button on past and cancelled bookings opens the listing. To test on screen.

## Reviews and messages
- [ ] **REV-06** Traveller type (family, couple, solo, group)
- [ ] **REV-07** Filter / sort reviews
- [ ] **REV-08** "Helpful" votes
- [ ] **REV-09** Review translation (EN ↔ UR)
- [ ] **REV-11** Review window (partial: 30 days)
- [ ] **MSG-05** Photo attachments
- [ ] **MSG-06** Partner quick-reply templates
- [ ] **MSG-10** In-app notification centre

## Cars and tours
- [ ] **CAR-05** Insurance / protection products
- [ ] **CAR-08** Fuel policy (partial: "Fuel included" yes/no)
- [ ] **CAR-11** Handover inspection (photos, fuel, odometer)
- [ ] **TOUR-02** Several time slots per day
- [ ] **TOUR-03** Ticket types (partial: Adult and child)
- [ ] **TOUR-04** Private-group pricing
- [ ] **TOUR-07** Filters: duration, difficulty, language (partial: Tour type only)
- [ ] **TOUR-09** Seats per departure date (partial: One number per tour (close seats on the calendar to reduce))
- [ ] **TOUR-10** Hotel pickup option

## Partners and listing a property
- [ ] **ONB-07** One account, several partner types
- [ ] **ONB-08** Import listing from another platform
- [ ] **JOIN-05** One or several properties / units in one flow (partial: one listing at a time; "Duplicate listing" afterwards)
- [ ] **JOIN-06** "You're listing…" summary to confirm the choice
- [ ] **JOIN-07** Quick start: go live with the minimum, finish later
- [ ] **JOIN-13** Chain / group / management company
- [ ] **JOIN-20** Languages spoken by staff (partial: homestays only)
- [ ] **JOIN-21** Check-in and check-out as time windows (partial: check-in from, check-out by)
- [ ] **JOIN-22** House rules: parties rule and pet charges (partial: children, pets, smoking only)
- [ ] **JOIN-28** Room amenities and view as a checklist (partial: free-text chips with suggestions)
- [ ] **JOIN-29** Smoking allowed per room (partial: property-wide only)
- [ ] **JOIN-35** Open for bookings from a date / how far ahead guests can book
- [ ] **JOIN-37** Photo minimum and quality checks (partial: at least 1, up to 20) – Require 5+ property photos and warn on low resolution.
- [ ] **JOIN-43** Choose to open now or later (partial: goes live on admin approval; can be paused afterwards)
- [ ] **JOIN-44** Host profile: about you, the property, the neighbourhood (partial: homestays: host name, photo, bio)
- [ ] **EXT-09** Advanced analytics (pace, market comparison, ranking)

## Admin
- [ ] **ADM-12** Platform-wide coupons / campaigns
- [ ] **ADM-13** Newsletter export / sending (partial: Subscribers saved and sent a welcome email; no admin list, export or campaigns)

# 7. No priority set yet

These had no note. Mark them when you decide.

- [ ] **SRCH-10** Facilities filter (partial: Typed comma list) – Checkbox chips from the known amenity list. Asked for again in test notes: not done.
- [ ] **SRCH-13** Distance from centre / landmark (filter + sort)
- [x] **SRCH-16** Card price = total for the stay: built 2026-11-11. With dates, cards show the cheapest one-room total with deals, fees and taxes, using the same formula as the quote. Search dates and guests now also carry into the listing. See docs/booking-parity.md.
- [ ] **MSG-07** Automatic translation
- [ ] **MSG-08** Push notifications (web / mobile)
- [ ] **TOUR-05** Mobile ticket / QR code checked by the partner
- [ ] **JOIN-39** Invoicing and tax details per property (partial: NTN, optional, on the partner only; no tax settings) – Ties to PAY-07 taxes and fees.
- [ ] **EXT-13** Partner mobile app / push
- [ ] **ADM-15** Business analytics (bookings, revenue, conversion, cancellations)
- [ ] **ADM-16** Content management (destinations, offers, home banners)
- [ ] **UX-04** Accessibility (WCAG) (partial: Not audited) – Run an accessibility audit on search, listing and checkout.
- [ ] Route fare tables (e.g. Gilgit → Skardu). The one-way fee and outside-city charge cover it for now.
- [ ] Reports count every day as available for fixed-departure tours, so their occupancy reads low.
- [ ] Voucher and confirmation email still show the partner's phone after confirmation.
- [ ] Code cleanup: about 350 lines and 2 packages can go (old date picker, SMS sign-in code, unused schema and permissions, repeated database checks).

# 8. Not now: do in future

- **AUTH-06** Authenticator app and SMS codes: we don't use SMS, and this is a startup.
- **AUTH-15** Book without an account.
- **SEC-05** Bot protection / CAPTCHA.
- **SEC-09** Audit log viewer.
- **PRO-08** Currency preference: we only serve Pakistan for now.
- **PRO-09** Email and notification preferences: needs a nurture and campaigns system in the admin first.

# 9. Not wanted

**AUTH-04** passwordless sign-in · **AUTH-05** passkeys · **AUTH-14** download my data · **MSG-09** SMS and WhatsApp notifications · **ADM-17** several admin roles · **SUP-04** support bot · **UX-01** more languages · **UX-03** native mobile apps

# 10. Done: built 2026-11-05

Built and checked on the server. Your testing of these is still open in section 2.

- [x] Security audit items: admin sign-in code, CNIC privacy and Gemini off by default, reception staff privacy, security headers, production start checks, upload limits and content checks, stolen sign-in token detection, scheduled jobs
- [x] **AUTH-12** Change email · **AUTH-16** New-device email · **SEC-08** Upload content checks · **SEC-13** Cookie notice
- [x] **SRCH-01** Destination suggestions · **SRCH-08** Hotel class filter · **SRCH-11** Free cancellation filter · **SRCH-14** Map view, with OpenStreetMap across the site · **LST-15** Star rating
- [x] **BKG-02** Instant confirmation · **TOUR-06** Instant confirmation for tours · **BKG-07** Arrival time · **BKG-09** Children's ages (at booking, not in search) · **MNG-05** Edit guest details
- [x] **PAY-09** Length-of-stay discounts · **EXT-03** Set prices by date range · **EXT-05** Stay rules · **EXT-06** Early-booking and last-minute deals
- [x] **MNG-09** Contact support about a booking · **SUP-03** Support case per booking · **ADM-14** Support cases and disputes in the admin · **MSG-11** Admin view of reported chats · **MSG-12** Messages in the partner dashboard
- [x] **CAR-02** Pickup place search · **CAR-04** Driver age check · **CAR-06** Paid extras · **CAR-07** Mileage policy · **REV-10** Car and tour review wording

# 11. From the code audit: 2026-11-10

Requirements and acceptance criteria are in docs/SRS-Audit-2026-11-10.md. Items already listed above are named by their ID and not repeated.
Left out on purpose: everything in sections 8 and 9, and anything international.

## Fix in the code first

- [x] **AUD-01** Signed-in API traffic is counted per user; refresh has a separate 20-per-15-minute session quota that survives token rotation. Anonymous traffic retains IP limits. Throttled refreshes, network failures and server outages preserve the known session. (`rate-limit-key.ts`, `auth.routes.ts`, `app.ts`, `api.ts`)
- [x] **AUD-02** Guest requests skip booking expiry when Inngest is configured. Scheduled expiry runs on every retry and propagates failures. The once-per-minute request fallback remains for installations without Inngest. (`booking.service.ts` `requireDatabase`)
- [ ] **AUD-03** (partial: sync takes up to 100 rooms per run, 10 at a time, within 40 seconds; nominal capacity 600 rooms per half hour. A failed feed keeps its last known blocked dates and its last successful read time, and the partner now sees a warning on any calendar not read for over 2 hours.) Still open: check the real interval once about 500 rooms have calendars; it cannot be measured on today's data. (`calendar.service.ts`, `CalendarSyncPanel.tsx`)
- [x] **AUD-05** A booking can open at most 5 Safepay payment pages; a sixth attempt is refused and the guest books again. (`startOnlinePayment`)
- [ ] **AUD-04** (partial: a dated or guest-count search now reads rooms only for listings that pass every other filter.) Still open, decision first: looking up all approved partners on every query (a one-minute cache would delay a newly approved or suspended partner showing up; storing the approval on the listing is the cleaner fix), and dropping descriptions from text search (fewer matches while the catalogue is small). (`listing.service.ts`)
- [x] **AUD-06** Each of the six frequent jobs has a named parallel Inngest step. Job-level and connection errors propagate for independent retries; successful steps are reused. The local timer still runs every job and logs failures independently. (`inngest.ts`, `scheduled.ts`)
- [x] **AUD-07** Reconciliation now reads only refunds still owed (from any period) or raised or sent in the period. Balances already read only unsettled bookings; they keep using the same `settlement` rules as statements, so the two cannot disagree, in place of a second copy of those rules in a database query. (`payouts.service.ts`)
- [x] **AUD-08** A daily job recounts booked rooms for today onwards from the bookings and corrects any counter that differs, logging each correction. Each room is recounted in one transaction that waits for a booking in progress on that room. (`availability.service.ts` `recountRoomNights`, `scheduled.ts`)
- [x] **AUD-09** One function, `vendorIdsFor(user, area)`, now answers "which business does this user work for" for listings, promo codes, payouts, reviews, reservations, messages and reports. The listing-draft check keeps its own lookup because it must also let people with no business yet start a draft. (`member-access.ts`)
- [x] **AUD-10** The booking, listing, room and vendor models are typed from their schemas, so `tsc` now rejects a wrong status or field in a query. Fixing what it flagged also made prices ignore a season or deal saved without its numbers. The other 17 models are still `Model<any>`.
- [x] **AUD-11** If a new booking's reference matches an existing one, the booking is made again with a new reference instead of failing. The reference keeps its 8 characters. (`createBooking`)
- [ ] **AUD-12** (partial: the doubled try/catch in `realtime.ts` is removed.) Still open: check Safepay's webhook signature, which needs the header name from Safepay's documentation. Withdrawn: dropping the Host-header fallback in `origin.ts`; it is harmless because cookies are tied to the site's own domain, and removing it would break Vercel preview links and a second domain such as www.

Local verification on 2026-11-10 for AUD-01, AUD-02 and AUD-06: TypeScript and frontend/backend production builds passed. In-memory regression checks exercised the running Express app's user/session quotas and token rotation, client refresh failures and concurrent refresh, scheduled expiry versus request fallback, and scheduler step replay/failure isolation. Database and external services were mocked; hosted Inngest and live database verification remain deployment checks. No test scripts were added to the repository.

Local verification on 2026-11-11 for AUD-03, AUD-04 and AUD-05: TypeScript and the backend build passed. The API was started against the configured database and nine searches (all four products, with and without dates, guests and rooms) returned the expected listings. The calendar sync and the payment-attempt cap were not exercised: they need partner calendar links and a Safepay payment.

Local verification on 2026-11-11 for AUD-07 to AUD-11 and the features ticked below: TypeScript and the full production build passed. The API was started against the configured database: search (with the new "who can stay" filter and its validation), a listing page (arrival instructions are not in the public data), and hotel and car price quotes all answered correctly. A read-only comparison of room-night counters with bookings found no differences, but the database has no upcoming bookings, so the recount has not corrected a real counter yet. Nothing was opened in a browser: the partner form fields, the listing page lines, the search filter, Add to calendar and Book again still need a look on screen.

## Build: needed before launch

- [ ] **FR-HTL-03** Charge extra beds and extra guests in the quote. The price is stored today but never charged. Goes with PAY-10.
- [ ] **FR-HTL-04** Guest CNIC at check-in. Needs you: ask the lawyer what records hotels must keep. Goes with PRO-02.
- [x] **FR-HTL-05 / FR-HST-02** Partners choose who can stay (all guests, families and married couples only, female guests only) and whether couples must show proof of marriage. Both show in the listing's policies, and search has a "Who can stay" filter for hotels and homestays. Existing listings say nothing until their partner fills it in. To test on screen.
- [x] **FR-HST-01** Partners can write arrival instructions (hotels and homestays). They are kept out of the public listing and shown to the guest on the voucher and in the confirmation email once the booking is confirmed. The text is copied onto the booking when it is made, like the phone number. To test on screen.
- [ ] **FR-CAR-01** Route fares for with-driver hire. Already noted in section 7 as "Route fare tables"; the audit rates it needed for launch.
- [ ] **FR-CAR-02** Driving licence photo, checked by the partner before self-drive handover.
- [ ] **FR-CAR-03** Handover and return record. Same as CAR-11.
- [ ] **FR-CAR-04** Deposit taken, deducted, returned.
- [ ] **FR-TUR-01** Names, ages and CNICs of every traveller on a tour.
- [ ] **FR-TUR-02** Seats and price per departure. Same as TOUR-09.
- [ ] **FR-TUR-03** (partial: a departure date with pending or confirmed bookings can no longer be removed; the partner is told to cancel those bookings first.) Still open: cancel a whole departure in one action: close it to new bookings, cancel each booking transactionally, and durably queue refunds and guest notifications with safe retries and visible partial progress.
- [ ] **FR-GST-02** Road or weather closure: admin cancels all affected bookings with full refunds.
- [ ] **FR-PRT-01** Commission owed by partners on Pay on arrival bookings: a page, reminders, and an overdue list for the admin.
- [ ] Already listed as needed for launch: **PAY-02** wallets, **PAY-14** invoices. Proposed launch scope, still decision first: **LST-04** rate plans and **LST-05** several room types in one booking.

## Build: as bookings grow

- [ ] **FR-HTL-06** One grid of all room types by date, with bulk close and price.
- [ ] **FR-HTL-07** Booking window and same-day cut-off. Same as JOIN-35.
- [ ] **FR-HTL-08** Custom cancellation rule beside the presets.
- [ ] **FR-HST-03** Security deposit terms for entire homes.
- [ ] **FR-HST-05 / FR-ADM-04** Reply time, acceptance rate, cancellations and overdue commission per partner.
- [ ] **FR-CAR-05** Pickup and return times in availability; half-day hire.
- [ ] **FR-CAR-06** Who pays for damage, stated on the listing. Goes with CAR-05.
- [ ] **FR-CAR-07** Driver profile for with-driver hire.
- [ ] **FR-TUR-04** Minimum group size per departure.
- [ ] **FR-GST-03** Dates, guests and filters in the search link.
- [ ] **FR-GST-06** A page per town for search engines.
- [ ] **FR-GST-07** Confirmed bookings open without a connection (the installed app has no offline support today).
- [ ] **FR-PRT-04** A link for every dashboard screen and reservation.
- [ ] **FR-ADM-01** Statements created on a schedule.
- [ ] Already listed: **PAY-10**, **SRCH-13**, **SRCH-15**, **SRCH-16**, **TOUR-02**, **TOUR-03**, **TOUR-04**, **TOUR-07**, **MSG-05**, **MSG-06**, **ONB-02**, **ONB-07**, **SEC-12**.

## Build: later

- [ ] **FR-PRT-06** Tips on weak listings (no map pin, few photos, slow replies).
- [ ] Already listed: **LST-08**, **LST-17**, **CAR-08**, **TOUR-10**, **MSG-10**, **PRO-12**, **MNG-12**, **MNG-06**.
