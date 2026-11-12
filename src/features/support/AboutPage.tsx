import { BadgeCheck, CreditCard, Headset, MapPin } from 'lucide-react';

const POINTS = [
  { icon: MapPin, title: 'Local by design', text: 'We only list Gilgit-Baltistan: hotels, family homestays, cars and jeeps with or without a driver, and guided tours, run by people who live there.' },
  { icon: BadgeCheck, title: 'Every partner is checked', text: 'Partners send their business or CNIC documents, and each listing is reviewed by our team before guests can book it.' },
  { icon: CreditCard, title: 'Pay the way that suits you', text: 'Pay now by card or wallet through Safepay and get an instant confirmation, or send a request and pay the partner on arrival. Prices are in PKR, with every fee shown before you book.' },
  { icon: Headset, title: 'Help when the road closes', text: 'Mountain roads close for snow, landslides and official orders. Contact us about any booking and we help you change or cancel it with the partner.' },
];

/** Who GBBookings is and how it works, the counterpart of Booking.com's About and How we work pages. */
export default function AboutPage({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <article className="mx-auto max-w-4xl space-y-10 pb-20">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-bold uppercase tracking-wider text-[#006F3C]">About us</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">Book Gilgit-Baltistan with the people who live there</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">GBBookings is a marketplace for travel in Gilgit-Baltistan. Local hotels, hosts, car rental companies and tour guides list with us. You compare them, book, and manage your trip in one place.</p>
      </header>

      <section aria-labelledby="how-we-work" className="space-y-5">
        <h2 id="how-we-work" className="text-xl font-bold text-slate-950">How we work</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {POINTS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5">
              <Icon className="h-6 w-6 text-[#006F3C]" aria-hidden="true" />
              <h3 className="mt-3 font-semibold text-slate-950">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-we-earn" className="space-y-2 text-sm leading-7 text-slate-600">
        <h2 id="how-we-earn" className="text-xl font-bold text-slate-950">How we earn</h2>
        <p>Partners pay GBBookings a commission on each completed booking. We don't add a booking fee of our own: any partner fees and taxes are shown as their own lines before you book. Listings marked Featured are shown first in Recommended order, and you can sort by price or rating instead.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-[#006F3C] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold">Have a place, a car or a tour?</h2><p className="text-sm text-emerald-50">List it and reach travellers planning their trip north.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate('become-partner')} className="min-h-11 rounded-lg bg-white px-4 text-sm font-semibold text-[#006F3C]">List your property</button>
          <button type="button" onClick={() => onNavigate('support')} className="min-h-11 rounded-lg border border-white/60 px-4 text-sm font-semibold text-white">Contact us</button>
        </div>
      </section>
    </article>
  );
}
