import { useState, type ReactNode } from 'react';
import { Check, ChevronLeft, Lightbulb, LoaderCircle } from 'lucide-react';
import { primaryButton, secondaryButton } from './RoomManager';

/** One page of the flow: one question, like a join.booking.com page. `problem` blocks Continue. */
export type FlowStep = { id: string; part: string; title: string; intro?: string; tip?: [string, string]; problem: string; content: ReactNode; wide?: boolean };
/** A card on the hub: Booking.com's "Property details / Units / Photos / Final steps". */
export type FlowPart = { name: string; text: string; action: string };

const choiceClass = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${selected ? 'border-[#006F3C] bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'}`;

/**
 * Booking.com-style registration for cars and tours: pages without a step counter, a tip card beside each, a square
 * Back and a wide Continue, and a hub between parts with a tick per part and "Complete registration" at the end.
 */
export default function RegistrationFlow({ name, subtitle, parts, steps, summary, busy, uploading, error, setError, onSaveDraft, onSubmit, onExit, verification }: {
  name: string; subtitle: string; parts: FlowPart[]; steps: FlowStep[];
  /** Rows shown inside each finished hub card: label, value, the step its Edit opens. */
  summary: Array<[string, string, string]>;
  busy: boolean; uploading: boolean; error: string; setError: (error: string) => void;
  onSaveDraft: () => void; onSubmit: () => void; onExit: () => void;
  /** A new partner's business details and documents: the last page, whose own submit completes the registration. */
  verification?: ReactNode;
}) {
  const [verifying, setVerifying] = useState(false);
  const [step, setStep] = useState(0);
  const [showHub, setShowHub] = useState(false);
  const [furthest, setFurthest] = useState(0);
  const current = steps[step];
  const firstProblem = (upTo: number) => steps.slice(0, upTo).map((item) => item.problem).find(Boolean);

  const go = (next: number) => {
    const blocking = firstProblem(next);
    if (next > step && blocking) { setError(blocking); return; }
    setError('');
    // Finishing a part goes back to the hub, as on Booking.com.
    setShowHub(next >= steps.length || (next > step && steps[next].part !== current.part));
    setFurthest((value) => Math.max(value, next));
    setStep(Math.min(next, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openStep = (index: number) => { setShowHub(false); setError(''); setStep(index); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const hubParts = parts.map((part, index) => {
    const ids = steps.flatMap((item, at) => (item.part === part.name ? [at] : []));
    return { ...part, index, first: ids[0], done: furthest > ids[ids.length - 1] && ids.every((at) => !steps[at].problem) };
  });
  const allDone = hubParts.every((part) => part.done);

  if (verifying && verification) return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <p className="min-w-0 truncate text-sm text-slate-500"><strong className="text-slate-900">{name}</strong>{subtitle && ` · ${subtitle}`}</p>
        <button type="button" onClick={() => setVerifying(false)} className="min-h-11 shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-900">Back to overview</button>
      </div>
      {verification}
    </div>
  );

  if (showHub) return (
    <div className="max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{name}</h2>
          <p className="mt-1 text-sm text-slate-500">Finish each part. GBBookings checks new listings before guests can book them, usually within a day, and emails you either way.</p>
        </div>
        <button type="button" onClick={onExit} disabled={busy} className="min-h-11 text-sm font-semibold text-slate-600 hover:text-slate-900">Exit</button>
      </div>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <ol className="space-y-3">
        {hubParts.map((part) => {
          const locked = hubParts.slice(0, part.index).some((before) => !before.done);
          const rows = summary.filter(([, , target]) => steps.find((item) => item.id === target)?.part === part.name);
          return (
            <li key={part.name} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-4">
                <span aria-hidden="true" className={`flex size-9 shrink-0 items-center justify-center rounded-full ${part.done ? 'bg-[#006F3C] text-white' : 'border-2 border-slate-300 text-slate-400'}`}>
                  {part.done ? <Check className="size-5" /> : part.index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-500">Step {part.index + 1}{part.done ? ' · done' : ''}</p>
                  <h3 className="font-extrabold">{part.name}</h3>
                  <p className="text-sm text-slate-500">{part.text}</p>
                </div>
                {part.done
                  ? <button type="button" className="min-h-11 text-sm font-bold text-[#006F3C]" onClick={() => openStep(part.first)}>Edit</button>
                  : <button type="button" className={locked ? secondaryButton : primaryButton} disabled={locked} onClick={() => openStep(part.first)}>{part.action}</button>}
              </div>
              {part.done && rows.length > 0 && (
                <dl className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                  {rows.map(([label, value, target]) => (
                    <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <dt className="text-sm font-bold">{label}</dt>
                      <dd className="min-w-0 flex-1 text-right text-sm text-slate-600">{value} <button type="button" className="ml-2 font-bold text-[#006F3C]" onClick={() => openStep(steps.findIndex((item) => item.id === target))}>Edit</button></dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          );
        })}
      </ol>
      {verification ? (
        <button type="button" className={`${primaryButton} w-full`} disabled={!allDone} onClick={() => { setVerifying(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Continue to partner verification</button>
      ) : (
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={secondaryButton} disabled={busy || uploading} onClick={onSaveDraft}>Save as draft</button>
          <button type="button" className={primaryButton} disabled={busy || uploading || !allDone} onClick={onSubmit}>{busy && <LoaderCircle className="size-4 animate-spin" />}Complete registration</button>
        </div>
      )}
      {!allDone && <p className="text-center text-xs text-slate-500">Finish every part to complete your registration.</p>}
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="min-w-0 flex-[999_1_520px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <p className="min-w-0 truncate text-sm text-slate-500"><strong className="text-slate-900">{name}</strong>{subtitle && ` · ${subtitle}`}</p>
          <button type="button" onClick={onExit} disabled={busy} className="min-h-11 shrink-0 text-sm font-semibold text-slate-600 hover:text-slate-900">Exit</button>
        </div>
        <div className={`space-y-5 ${current.wide ? 'max-w-3xl' : 'max-w-xl'}`}>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{current.title}</h2>
            {current.intro && <p className="mt-1.5 text-sm leading-6 text-slate-500">{current.intro}</p>}
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">{current.content}</div>
          <div className="flex gap-3">
            {step > 0 && <button type="button" aria-label="Back" className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-[#006F3C] bg-white text-[#006F3C] hover:bg-emerald-50" onClick={() => go(step - 1)}><ChevronLeft className="size-5" /></button>}
            <button type="button" className={`${primaryButton} flex-1`} disabled={uploading} onClick={() => go(step + 1)}>Continue</button>
          </div>
        </div>
      </div>
      {current.tip && (
        <aside aria-label="Tip" className="mt-14 hidden w-72 shrink-0 rounded-2xl border border-slate-200 bg-white p-4 lg:block">
          <p className="flex items-start gap-2 text-sm font-bold text-slate-900"><Lightbulb className="mt-0.5 size-4 shrink-0 text-[#006F3C]" aria-hidden="true" />{current.tip[0]}</p>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">{current.tip[1]}</p>
        </aside>
      )}
    </div>
  );
}

/** Final steps: Request to book or Instant confirmation, with Booking.com's "important info". */
export function BookingModeField({ value, onChange, noun }: { value: boolean; onChange: (instant: boolean) => void; noun: string }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {([[false, 'Request to book', 'You confirm each Pay on arrival request within a day; it expires if you don\'t. Pay now bookings are always confirmed at once.'],
          [true, 'Instant confirmation', 'Every booking is confirmed straight away, as on Booking.com. Keep your calendar up to date and close dates you can\'t take.']] as const).map(([option, label, text]) => (
          <label key={label} className={choiceClass(value === option)}>
            <input type="radio" name="instant-book" checked={value === option} onChange={() => onChange(option)} className="mt-1 size-4 accent-[#006F3C]" />
            <span><span className="block text-sm font-bold">{label}</span><span className="text-xs leading-5 text-slate-500">{text}</span></span>
          </label>
        ))}
      </div>
      <dl className="space-y-3 text-sm">
        <div><dt className="font-bold">Can I decide when I get bookings?</dt><dd className="text-slate-600">Yes. Close any dates the {noun} isn't available, including dates booked elsewhere.</dd></div>
        <div><dt className="font-bold">When does my {noun} go live?</dt><dd className="text-slate-600">After GBBookings checks it, usually within a day. You can pause it any time from your dashboard.</dd></div>
        <div><dt className="font-bold">What does it cost?</dt><dd className="text-slate-600">A commission on each completed booking. Listing is free.</dd></div>
      </dl>
    </div>
  );
}
