import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { KeyRound, LogOut } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { useAuth } from '@/providers/AuthProvider';
import { supabase, friendlyError } from '@/lib/supabase';
import { cn } from '@/lib/utils';

/**
 * Second step after the password: a short PIN.
 *
 * ── Where the PIN actually lives ───────────────────────────────────────────
 * In the database, as a bcrypt hash, checked by verify_admin_pin(). It is not
 * in this file and not in the bundle. A comparison like `entered === '1596'`
 * written here would ship the code to every visitor in plain text — it would
 * look like a lock and be a label.
 *
 * ── What it is for ────────────────────────────────────────────────────────
 * Somebody sitting down at a browser that is already signed in: a shared
 * machine, a borrowed laptop, a session left open in an office. That is a real
 * risk and this is a reasonable answer to it.
 *
 * It is not a defence against somebody who knows the admin password. Once
 * signed in, their token already satisfies row level security, and skipping a
 * client-side gate takes a few seconds in the browser console. Turning this
 * into a true second factor would mean checking the PIN inside the RLS
 * policies themselves, or using Supabase's own MFA.
 *
 * ── Why sessionStorage ─────────────────────────────────────────────────────
 * The unlock lasts for the tab and dies when it closes. localStorage would
 * survive a reboot, which defeats the point; asking on every page change would
 * make the console unusable.
 */

const UNLOCK_KEY = 'act.admin.unlocked';
const PIN_LENGTH = 4;

export function PinGate({ children }: { children: ReactNode }) {
  const { signOut, email } = useAuth();

  const [unlocked, setUnlocked] = useState(
    () => sessionStorage.getItem(UNLOCK_KEY) === 'true',
  );
  const [digits, setDigits] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!unlocked) inputRef.current?.focus();
  }, [unlocked]);

  const submit = useCallback(
    async (pin: string) => {
      setBusy(true);
      setError(null);

      try {
        const { data, error: rpcError } = await supabase.rpc('verify_admin_pin', {
          p_pin: pin,
        });

        if (rpcError) throw new Error(friendlyError(rpcError));

        if (data === true) {
          sessionStorage.setItem(UNLOCK_KEY, 'true');
          setUnlocked(true);
          return;
        }

        setError('That code is not right.');
        setDigits('');
        setShake(true);
        setTimeout(() => setShake(false), 420);
      } catch (caught) {
        setError((caught as Error).message);
        setDigits('');
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  /* Submit automatically on the last digit. Asking somebody to type four
     numbers and then reach for a button is a step too many. */
  useEffect(() => {
    if (digits.length === PIN_LENGTH && !busy) void submit(digits);
  }, [digits, busy, submit]);

  if (unlocked) return <>{children}</>;

  return (
    <Container size="narrow" className="py-20">
      <div className="mx-auto max-w-sm text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
        >
          <KeyRound size={22} />
        </span>

        <h1 className="mt-5 text-h2 text-ink">Enter your access code</h1>
        <p className="mt-2 text-body-sm text-ink-muted">
          {email ? `Signed in as ${email}.` : ''} One more step before the console opens.
        </p>

        {/* A single real input holds the value; the boxes are decoration.
            Four separate inputs need focus juggling, break paste, and confuse
            password managers — for four digits it is not worth it. */}
        <label htmlFor="admin-pin" className="sr-only">
          Access code
        </label>
        <input
          ref={inputRef}
          id="admin-pin"
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={PIN_LENGTH}
          value={digits}
          disabled={busy}
          onChange={(e) => {
            setDigits(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH));
            setError(null);
          }}
          className="peer sr-only"
        />

        <div
          onClick={() => inputRef.current?.focus()}
          className={cn(
            'mt-8 flex justify-center gap-3',
            shake && 'animate-[fade-in_0.42s_ease]',
          )}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={cn(
                'grid h-14 w-12 cursor-pointer place-items-center rounded-tile border-2 text-h2 transition-colors',
                error
                  ? 'border-danger text-danger-ink'
                  : i < digits.length
                    ? 'border-brand bg-brand-soft text-brand-ink'
                    : 'border-line bg-surface text-ink-subtle',
              )}
            >
              {i < digits.length ? '•' : ''}
            </span>
          ))}
        </div>

        <div aria-live="polite" className="mt-5 min-h-[1.5rem]">
          {busy && <p className="text-body-sm text-ink-muted">Checking…</p>}
          {error && !busy && <p className="text-body-sm text-danger-ink">{error}</p>}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="mt-3"
          leadingIcon={<LogOut size={15} />}
          onClick={() => void signOut()}
        >
          Sign out instead
        </Button>
      </div>
    </Container>
  );
}

/** Clear the unlock — called on sign out so the next person must re-enter it. */
export function clearAdminUnlock(): void {
  sessionStorage.removeItem(UNLOCK_KEY);
}
