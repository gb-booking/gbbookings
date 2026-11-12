import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { LoaderCircle, MailCheck, Store } from 'lucide-react';
import { api } from '../../shared/api/api';

const primaryButton = 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#006F3C] px-5 text-sm font-semibold text-white hover:bg-[#005c32] disabled:opacity-50';
const secondaryButton = 'inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50';
const card = 'mx-auto max-w-md space-y-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8';

/**
 * The partner sign-in, like Booking.com's separate "Sign in to manage your property": the partner page opens in its own
 * tab, and nobody sees the listing steps until they are signed in and have proved their email with a one-time code.
 * Partners already running a business pass straight through.
 */
export default function PartnerGate({ isLoggedIn, isPartner, onSignIn, children }: {
  isLoggedIn: boolean; isPartner: boolean; onSignIn: (mode: 'signin' | 'register') => void; children: ReactNode;
}) {
  const [status, setStatus] = useState<{ verified: boolean; email: string } | null>(null);
  const [challengeId, setChallengeId] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  useEffect(() => {
    if (!isLoggedIn || isPartner) return undefined;
    let active = true;
    setStatus(null);
    api.getPartnerVerification().then((result) => active && setStatus(result)).catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Could not check your account.'));
    return () => { active = false; };
  }, [isLoggedIn, isPartner]);

  if (isPartner || status?.verified) return <>{children}</>;

  if (!isLoggedIn) return (
    <div className="px-4 py-10">
      <div className={card}>
        <Store className="size-8 text-[#006F3C]" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Sign in to list your property</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">Hotels, homestays, cars and tours in Gilgit-Baltistan. Sign in, confirm your email with a code, then add your first listing step by step.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => onSignIn('signin')}>Sign in</button>
        <button type="button" className={secondaryButton} onClick={() => onSignIn('register')}>Create your partner account</button>
        <p className="text-xs text-slate-500">Use the email you want guests' bookings and our messages to reach.</p>
      </div>
    </div>
  );

  const send = async () => {
    setBusy(true); setError('');
    try {
      const result = await api.requestPartnerCode();
      setChallengeId(result.challengeId); setCode('');
      setSent(`We sent a 6-digit code to ${status?.email}. It expires in ${Math.round(result.expiresInSeconds / 60)} minutes.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The code could not be sent. Try again.');
    } finally { setBusy(false); }
  };
  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true); setError('');
    try { setStatus(await api.confirmPartnerCode(challengeId, code.trim())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'That code did not work.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="px-4 py-10">
      <div className={card}>
        <MailCheck className="size-8 text-[#006F3C]" aria-hidden="true" />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-950">Verify your email</h1>
          <p className="mt-1 text-sm leading-6 text-slate-600">Before you list a property, confirm that <strong>{status?.email ?? 'your email'}</strong> is yours. We'll send a one-time code.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {!status ? <div className="flex justify-center" role="status"><LoaderCircle className="size-6 animate-spin text-[#006F3C]" /><span className="sr-only">Checking your account</span></div>
          : !challengeId ? <button type="button" className={primaryButton} disabled={busy} onClick={send}>{busy && <LoaderCircle className="size-4 animate-spin" />}Send me a code</button>
          : <form onSubmit={confirm} className="space-y-3">
            <p role="status" className="text-sm text-slate-600">{sent}</p>
            <label className="block text-sm font-semibold text-slate-700">6-digit code
              <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required minLength={6} maxLength={6} autoFocus
                className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-center text-lg tracking-[0.4em] outline-none focus:border-[#006F3C]" />
            </label>
            <button className={primaryButton} disabled={busy || code.length !== 6}>{busy && <LoaderCircle className="size-4 animate-spin" />}Verify and continue</button>
            <button type="button" className="min-h-11 w-full text-sm font-semibold text-[#006F3C]" disabled={busy} onClick={send}>Send a new code</button>
          </form>}
      </div>
    </div>
  );
}
