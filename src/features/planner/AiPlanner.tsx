import { useState, type FormEvent } from 'react';
import { Compass, MapPin, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import type { Listing } from '../../types';
import Select from '../../shared/components/Select';
import { TOWNS } from '../../shared/utils/places';
import AiChat from './AiChat';

/** Original full-page planner presentation, backed by the current trip API. */
export default function AiPlanner({ onSelectListing }: { onSelectListing: (listing: Listing) => void }) {
  const [destination, setDestination] = useState('Hunza');
  const [budget, setBudget] = useState('Economy');
  const [amount, setAmount] = useState('');
  const [duration, setDuration] = useState('5');
  const [travelers, setTravelers] = useState('2');
  const [interests, setInterests] = useState('');
  const [generating, setGenerating] = useState(false);
  const [request, setRequest] = useState<{ text: string; sequence: number } | null>(null);
  const generate = (event: FormEvent) => {
    event.preventDefault();
    if (generating) return;
    setGenerating(true);
    const text = `Plan a ${duration}-day trip to ${destination} for ${travelers} travelers. Travel style: ${budget}.${amount ? ` Total budget: PKR ${amount}.` : ''}${interests.trim() ? ` Interests: ${interests.trim()}.` : ''} Give me a practical day-by-day itinerary and suggest suitable listings from the current catalogue. Use only actual catalogue prices and availability; tell me when something needs confirming.`;
    setRequest(previous => ({ text, sequence: (previous?.sequence ?? 0) + 1 }));
  };
  const field = 'w-full min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-[#006F3C] focus:bg-white';
  const label = 'block text-xs font-bold uppercase tracking-wide text-slate-500';
  return <div id="ai-planner-view" className="space-y-6 pb-16">
    <header className="flex items-start gap-3 border-b border-slate-200 pb-5 sm:gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600"><Sparkles className="size-6" /></span>
      <div><h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">GBBookings AI Companion</h1><p className="mt-1 text-sm leading-relaxed text-slate-500">Your personal travel planner for Gilgit Baltistan. Shape your trip, then explore your itinerary.</p></div>
    </header>
    <div className="grid items-start gap-6 lg:grid-cols-12">
      <aside className="space-y-4 lg:col-span-4 xl:col-span-3">
        <form id="form-itinerary-inputs" onSubmit={generate} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-bold uppercase tracking-wide text-slate-900"><Sparkles className="size-4 text-indigo-600" />Specify Trip Vectors</h2>
          <label className="block space-y-1.5"><span className={label}>Target Sector</span><Select aria-label="Target sector" value={destination} onChange={event => setDestination(event.target.value)} className={field}>{TOWNS.map(town => <option key={town} value={town}>{town}</option>)}</Select></label>
          <fieldset className="space-y-1.5"><legend className={label}>Budget Mode</legend><div className="grid grid-cols-3 gap-1.5">{['Economy', 'Business', 'Elite Luxury'].map(mode => <button key={mode} type="button" aria-pressed={budget === mode} onClick={() => setBudget(mode)} className={`min-h-11 rounded-lg border px-1.5 text-xs font-bold transition-colors ${budget === mode ? 'border-[#006F3C] bg-[#006F3C] text-white shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#006F3C] hover:text-[#006F3C]'}`}>{mode}</button>)}</div></fieldset>
          <label className="block space-y-1.5"><span className={label}>Total Budget (PKR)</span><input type="number" min="1" step="1" value={amount} onChange={event => setAmount(event.target.value)} placeholder="Your total trip budget" className={field} /></label>
          <div className="grid grid-cols-2 gap-3"><label className="block space-y-1.5"><span className={label}>Duration (Days)</span><Select aria-label="Duration in days" value={duration} onChange={event => setDuration(event.target.value)} className={field}>{[1,2,3,4,5,6,7,8,9,10,12,14,21,30].map(day => <option key={day} value={String(day)}>{day} {day === 1 ? 'Day' : 'Days'}</option>)}</Select></label><label className="block space-y-1.5"><span className={label}>Travelers</span><Select aria-label="Travelers" value={travelers} onChange={event => setTravelers(event.target.value)} className={field}>{[1,2,3,4,5,6,8,10,15,20].map(count => <option key={count} value={String(count)}>{count} {count === 1 ? 'Person' : 'People'}</option>)}</Select></label></div>
          <label className="block space-y-1.5"><span className={label}>Personalized Interests</span><textarea value={interests} onChange={event => setInterests(event.target.value)} rows={3} maxLength={400} placeholder="Historic forts, mountain trails, local food, photography…" className={`${field} resize-y`} /></label>
          <button type="submit" disabled={generating} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#006F3C] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#005C32] disabled:opacity-60"><Sparkles className={`size-4 ${generating ? 'animate-pulse' : ''}`} />{generating ? 'Creating your itinerary…' : 'Generate Itinerary'}</button>
        </form>
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-xs leading-relaxed text-slate-600">{[{icon:MapPin,text:'Trips across Gilgit Baltistan'},{icon:Wallet,text:'A plan shaped around your budget'},{icon:ShieldCheck,text:'Recommendations from the live catalogue'}].map(({icon:Icon,text})=><p key={text} className="flex items-center gap-2"><Icon className="size-4 shrink-0 text-[#006F3C]" />{text}</p>)}</div>
      </aside>
      <section aria-label="Your itinerary" className="min-w-0 lg:col-span-8 xl:col-span-9">
        {request ? <AiChat key={request.sequence} embedded initialPrompt={request.text} onThinkingChange={setGenerating} onClose={() => { setRequest(null); setGenerating(false); }} onSelectListing={onSelectListing} /> : <div className="flex min-h-[540px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><span className="mb-5 flex size-20 items-center justify-center rounded-3xl border border-emerald-100 bg-emerald-50"><Compass className="size-10 text-[#006F3C]" /></span><h2 className="text-xl font-bold text-slate-900">Your next adventure starts here</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-slate-500">Choose your destination, budget and interests. Your personalized itinerary will appear here, with places you can explore and book.</p></div>}
      </section>
    </div>
  </div>;
}
