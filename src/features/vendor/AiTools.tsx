import { useEffect, useState } from 'react';
import { Bot, Copy, LoaderCircle, Send, Sparkles, X } from 'lucide-react';
import { api } from '../../shared/api/api';
import Select from '../../shared/components/Select';
import { toast } from '../../shared/components/Toaster';

type Mode = 'pricing' | 'content' | 'reviews';
type Result = { mode: 'pricing'; items: Array<{ title: string; reason: string }> } | { mode: 'content'; title: string; seoTitle: string; description: string } | { mode: 'reviews'; summary: string; praise: string[]; complaints: string[] };

const card = 'rounded-2xl border border-[#E1E5DE] bg-white p-4 sm:p-6';
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#006F3C] px-4 text-sm font-semibold text-white hover:bg-[#005c32] disabled:opacity-50';
const LABEL: Record<Mode, string> = { pricing: 'Pricing ideas', content: 'Listing text', reviews: 'Review summary' };

/**
 * AI suggestions for one listing: price ideas, rewritten text, or a review summary. Each card can be dismissed;
 * "Use this" only copies text or opens the place to change it, because a person makes every change.
 */
export function AiSuggestionTools({ modes = ['pricing', 'content', 'reviews'], staff = false, onOpenPricing }: { modes?: Mode[]; staff?: boolean; onOpenPricing?: (listingId: string) => void }) {
  const [listings, setListings] = useState<Array<{ id: string; title: string }> | null>(null);
  const [listingId, setListingId] = useState('');
  const [mode, setMode] = useState<Mode>(modes[0]);
  const [result, setResult] = useState<Result | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = staff ? api.admin.listListings({ status: 'published', limit: 100 }).then((page) => page.data) : api.getVendorListings();
    load.then((items) => { setListings(items.map((item) => ({ id: item.id, title: item.title }))); setListingId(items[0]?.id ?? ''); }).catch((reason: Error) => setError(reason.message));
  }, [staff]);

  const run = async () => {
    setBusy(true); setError(''); setDismissed([]);
    try {
      if (mode === 'pricing') setResult({ mode, items: await api.aiTools.pricing(listingId) });
      else if (mode === 'content') setResult({ mode, ...await api.aiTools.content(listingId) });
      else setResult({ mode, ...await api.aiTools.reviews(listingId) });
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  };
  const copy = (text: string) => void navigator.clipboard.writeText(text).then(() => toast('Copied. Paste it where you edit the listing.'));

  return <div className="space-y-4">
    {!staff && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Suggestions only. Nothing changes on your listing unless you change it yourself.</p>}
    <div className={`${card} flex flex-wrap items-end gap-3`}>
      {listings === null && !error ? <LoaderCircle className="size-5 animate-spin text-[#006F3C]" aria-label="Loading" /> : listings?.length === 0 ? <p className="text-sm text-slate-500">No listings yet.</p> : <>
        <label className="text-xs font-semibold">Listing<Select value={listingId} onChange={(event) => { setListingId(event.target.value); setResult(null); }} className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3 text-sm">{listings?.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></label>
        {modes.length > 1 && <label className="text-xs font-semibold">Ask for<Select value={mode} onChange={(event) => { setMode(event.target.value as Mode); setResult(null); }} className="mt-1 block min-h-11 rounded-lg border border-slate-300 px-3 text-sm">{modes.map((item) => <option key={item} value={item}>{LABEL[item]}</option>)}</Select></label>}
        <button type="button" className={primary} disabled={busy || !listingId} onClick={() => void run()}>{busy ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{result ? 'Regenerate' : 'Suggest'}</button>
      </>}
    </div>
    {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {result?.mode === 'pricing' && result.items.filter((item) => !dismissed.includes(item.title)).map((item) => <div key={item.title} className={`${card} space-y-2`}>
      <p className="font-semibold">{item.title}</p><p className="text-sm text-slate-600">{item.reason}</p>
      <div className="flex gap-2">{onOpenPricing && <button type="button" className={primary} onClick={() => onOpenPricing(listingId)}>Use this</button>}<button type="button" className={button} onClick={() => setDismissed([...dismissed, item.title])}><X className="size-4" />Dismiss</button></div>
    </div>)}
    {result?.mode === 'content' && <div className={`${card} space-y-3 text-sm`}>
      {([['Title', result.title], ['Search title', result.seoTitle], ['Description', result.description]] as const).map(([label, text]) => <div key={label} className="space-y-1">
        <div className="flex items-center justify-between"><p className="font-semibold">{label}</p><button type="button" className={button} onClick={() => copy(text)}><Copy className="size-4" />Use this</button></div>
        <p className="whitespace-pre-wrap text-slate-700">{text}</p></div>)}
    </div>}
    {result?.mode === 'reviews' && <div className={`${card} space-y-2 text-sm`}><p>{result.summary}</p>
      {!!result.praise.length && <><p className="font-semibold">Guests like</p><ul className="list-disc pl-5">{result.praise.map((item) => <li key={item}>{item}</li>)}</ul></>}
      {!!result.complaints.length && <><p className="font-semibold">To improve</p><ul className="list-disc pl-5">{result.complaints.map((item) => <li key={item}>{item}</li>)}</ul></>}</div>}
  </div>;
}

/** A chat about using GBBookings. It cannot see account data, and says so. */
export function AssistantChat() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    const next = [...messages, { role: 'user' as const, text: text.trim() }].slice(-20);
    setMessages(next); setText(''); setBusy(true);
    try { const { reply } = await api.aiTools.assistant(next); setMessages([...next, { role: 'assistant', text: reply }]); }
    catch (reason) { toast((reason as Error).message, 'error'); }
    finally { setBusy(false); }
  };
  return <div className={`${card} space-y-4`}>
    <p className="flex items-center gap-2 text-sm text-slate-600"><Bot className="size-4 text-[#006F3C]" />Ask how to do something on GBBookings. The assistant cannot see your account, so give it any figures it needs.</p>
    <ul className="max-h-[50vh] space-y-2 overflow-y-auto">{messages.map((message, index) => <li key={index} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${message.role === 'user' ? 'ml-auto bg-[#006F3C] text-white' : 'bg-slate-100 text-slate-800'}`}>{message.text}</li>)}
      {busy && <li><LoaderCircle className="size-4 animate-spin text-[#006F3C]" aria-label="Thinking" /></li>}</ul>
    <form onSubmit={send} className="flex gap-2"><input required maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} placeholder="e.g. How do I close dates for a room?" className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm" />
      <button className={primary} disabled={busy || !text.trim()} aria-label="Send"><Send className="size-4" /></button></form>
  </div>;
}
