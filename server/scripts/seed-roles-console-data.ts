/**
 * Seed demo data for the new roles-console pages (branch roles-console).
 *
 * Run:  npm run seed:roles
 * Needs: MONGODB_URI in the environment (see .env.example). Never print the URI.
 *
 * What it seeds:
 * - Platform profile (website name, support contacts, default currency, timezone,
 *   languages, currencies) — fills only missing fields, never overwrites the admin's values.
 * - A few AI trip-planner requests, so the Super Admin's AI planner page has rows.
 * - If a no-show booking exists, one open no-show dispute on it (Disputes page).
 * - If any booking exists, one open support case on the most recent one (Messages page).
 *
 * What it deliberately does NOT seed: bookings, refunds or payouts. Those are money
 * records — inventing them would pollute real financial data. Refunds, payouts and
 * payment requests appear once real bookings exist; their pages show empty states until then.
 * Re-running is safe: every step checks first and skips what already exists.
 *
 * Safety: refuses to run with NODE_ENV=production unless you pass --allow-production.
 */
import { connectDatabase } from '../database/connection.js';
import { BookingModel } from '../models/booking.model.js';
import { PlannerRequestModel } from '../models/planner-request.model.js';
import { PlatformSettingModel } from '../models/platform-setting.model.js';
import { SupportCaseModel } from '../models/support-case.model.js';

const ALLOW_PRODUCTION = process.argv.includes('--allow-production');

async function seedPlatformProfile() {
  const existing = await PlatformSettingModel.findOne({ key: 'platform' }).lean() as any;
  const profile = {
    websiteName: 'GBBookings',
    supportEmail: 'support@gbbookings.com',
    supportPhone: '+92 300 1234567',
    defaultCurrency: 'PKR',
    timezone: 'Asia/Karachi',
    defaultLanguage: 'en',
    languages: [
      { code: 'en', name: 'English', enabled: true },
      { code: 'ur', name: 'Urdu', enabled: true },
    ],
    supportedCurrencies: [
      { code: 'PKR', name: 'Pakistani Rupee' },
      { code: 'USD', name: 'US Dollar' },
    ],
  };
  if (!existing) {
    await PlatformSettingModel.create({ key: 'platform', ...profile });
    console.log('platform profile: created');
    return;
  }
  const missing = Object.fromEntries(Object.entries(profile).filter(([key]) => existing[key] === undefined || existing[key] === null || (Array.isArray(existing[key]) && existing[key].length === 0)));
  if (Object.keys(missing).length === 0) { console.log('platform profile: already set, kept as-is'); return; }
  await PlatformSettingModel.updateOne({ key: 'platform' }, { $set: missing });
  console.log(`platform profile: filled missing fields (${Object.keys(missing).join(', ')})`);
}

const PLANNER_REQUESTS = [
  { request: '3 din ka Hunza trip plan karo, 2 log, budget 80,000 PKR.', reply: 'Day 1: Karimabad aur Baltit Fort. Day 2: Attabad Lake aur Passu Cones. Day 3: Khunjerab Pass (season par depend karta hai).' },
  { request: 'Skardu mein family ke liye best hotel kaun sa hai? 2 rooms chahiye.', reply: 'Family ke liye Shangrila Resort aur Serena Khaplu achhe options hain. Dates batayen to availability check kar dun.' },
  { request: 'Naran trip in December, car chahiye with driver. Kya road open hota hai?', reply: 'December mein Babusar Top band hota hai; Naran tak Kaghan route se jana parta hai, aur baraf par depend karta hai. Driver wali car behtar rahegi.' },
];

async function seedPlannerRequests() {
  let created = 0;
  for (const item of PLANNER_REQUESTS) {
    const exists = await PlannerRequestModel.exists({ request: item.request });
    if (exists) continue;
    await PlannerRequestModel.create({ ...item, listings: [] });
    created += 1;
  }
  console.log(`planner requests: ${created} added (${PLANNER_REQUESTS.length - created} already there)`);
}

async function seedDispute() {
  const booking = await BookingModel.findOne({ status: 'no_show', 'noShow.dispute.status': { $ne: 'open' } }).sort({ createdAt: -1 }).lean() as any;
  if (!booking) { console.log('dispute: skipped — no no-show booking without an open dispute'); return; }
  await BookingModel.updateOne({ _id: booking._id }, {
    $set: {
      'noShow.at': booking.noShow?.at ?? new Date(),
      'noShow.dispute': { status: 'open', note: 'I reached the hotel on time, but the reception said my booking was not on their list.', at: new Date() },
    },
  });
  console.log(`dispute: open dispute added on booking ${booking.reference ?? booking.publicId}`);
}

async function seedSupportCase() {
  const booking = await BookingModel.findOne().sort({ createdAt: -1 }).lean() as any;
  if (!booking) { console.log('support case: skipped — no bookings in the database yet'); return; }
  const exists = await SupportCaseModel.exists({ bookingId: booking._id });
  if (exists) { console.log('support case: already one for the latest booking'); return; }
  await SupportCaseModel.create({
    bookingId: booking._id,
    customerId: booking.customerId,
    status: 'open',
    messages: [
      { from: 'guest', senderId: booking.customerId, body: 'Salam, meri booking confirm hui ya nahi? Mujhe confirmation email nahi mili.', at: new Date(Date.now() - 2 * 3_600_000) },
    ],
    lastMessageAt: new Date(Date.now() - 2 * 3_600_000),
  });
  console.log(`support case: open case added on booking ${booking.reference ?? booking.publicId}`);
}

async function main() {
  if (process.env.NODE_ENV === 'production' && !ALLOW_PRODUCTION) {
    console.error('Refusing to seed a production database. Re-run with --allow-production if you really mean it.');
    process.exitCode = 1;
    return;
  }
  if (!await connectDatabase()) {
    console.error('Could not connect to MongoDB. Set MONGODB_URI and try again.');
    process.exitCode = 1;
    return;
  }
  await seedPlatformProfile();
  await seedPlannerRequests();
  await seedDispute();
  await seedSupportCase();
  console.log('Done.');
  process.exit(0);
}

main().catch((error) => { console.error('Seed failed:', error instanceof Error ? error.message : error); process.exit(1); });
