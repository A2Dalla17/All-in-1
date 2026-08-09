/**
 * "Enter your staff code" — the confirmation gate on sensitive actions.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What this is for
 * ══════════════════════════════════════════════════════════════════════════
 * Not to keep anyone out. The operator is already signed in; if they were not,
 * every query would return nothing regardless of what they typed here.
 *
 * It exists so the audit trail can say **who**. A shared Control Centre login
 * on a shared machine means "the Control Centre approved this restaurant",
 * which is useless the day somebody asks why. Four digits typed by the person
 * clicking the button turns that into "Approved by A2".
 *
 * It is a deliberate speed bump too. Approving a restaurant makes a public
 * claim that a business has agreed to work with GALEYR; a step that requires
 * stopping and typing is the difference between doing that and doing it by
 * accident on a busy screen.
 *
 * ── Why the code is never held in state longer than a keystroke ────────────
 * On success the server returns a single-use token valid for two minutes, and
 * that is what gets passed to the action. The digits are never stored, never
 * put in a query key, and go to exactly one endpoint.
 */

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, Lock, ShieldCheck } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Modal } from '@shared/components/ui/Modal';
import { verifyStaffCode } from '@shared/api/ops';
import { cn } from '@shared/lib/utils';

export interface StaffCodeRequest {
  /** Shown in the dialog: "Approve Aroos Restaurant". */
  actionLabel: string;
  /** Optional extra line explaining what will happen. */
  detail?: string;
  /** Called with the single-use confirmation token. */
  onConfirmed: (token: string, staffRef: string) => void;
}

export function StaffCodeDialog({
  request,
  onClose,
}: {
  request: StaffCodeRequest | null;
  onClose: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Reset between uses. Without this, reopening the dialog would show the
     previous attempt's error, which reads as though the new action has already
     failed. */
  useEffect(() => {
    if (request) {
      setCode('');
      setError('');
      /* Focused on open: this is a four-keystroke interaction and reaching for
         the mouse first doubles it. */
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [request]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!request || code.length !== 4) return;

    setBusy(true);
    setError('');

    try {
      const result = await verifyStaffCode(code);

      if (result.ok && result.token) {
        request.onConfirmed(result.token, result.staff_ref ?? '');
        onClose();
        return;
      }

      /* Each reason gets its own sentence. "Invalid" tells an operator nothing
         about whether to try again, ask an admin, or wait. */
      switch (result.reason) {
        case 'locked': {
          const until = result.locked_until
            ? new Date(result.locked_until).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'shortly';
          setError(`Too many incorrect attempts. Locked until ${until}.`);
          break;
        }
        case 'no_code_set':
          setError('No staff code has been set for your account. Ask an administrator.');
          break;
        case 'not_staff':
          setError('Your account is not registered as Control Centre staff.');
          break;
        default:
          setError(
            result.attempts_remaining > 0
              ? `That code is not correct. ${result.attempts_remaining} attempt${
                  result.attempts_remaining === 1 ? '' : 's'
                } remaining.`
              : 'That code is not correct.',
          );
      }

      setCode('');
      inputRef.current?.focus();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not check that code.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={request !== null}
      onClose={onClose}
      title="Enter your staff code"
      size="sm"
    >
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid h-12 w-12 place-items-center rounded-tile bg-brand-soft text-brand-ink"
        >
          <Lock size={22} />
        </span>

        <p className="mt-4 font-semibold text-ink">{request?.actionLabel}</p>
        {request?.detail && (
          <p className="mt-1 text-body-sm text-ink-muted">{request.detail}</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6">
        <label htmlFor="staff-code" className="sr-only">
          Your 4-digit staff code
        </label>

        <input
          ref={inputRef}
          id="staff-code"
          value={code}
          onChange={(e) => {
            /* Digits only, hard-capped at four. Stripping here rather than
               validating on submit means the field cannot hold anything the
               server would reject. */
            setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
            setError('');
          }}
          /* `password` so it does not appear on screen over an operator's
             shoulder, and so browsers do not offer to remember it. */
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={4}
          aria-describedby={error ? 'staff-code-error' : undefined}
          className={cn(
            'mx-auto block w-40 rounded-input border bg-card py-4 text-center',
            'text-h3 font-bold tracking-[0.5em] text-ink',
            'focus:outline-none focus:ring-2 focus:ring-brand/25',
            error ? 'border-danger' : 'border-line focus:border-brand',
          )}
        />

        {error && (
          <p
            id="staff-code-error"
            role="alert"
            className="mt-4 flex items-start justify-center gap-2 text-center text-body-sm text-danger"
          >
            <AlertCircle size={15} aria-hidden className="mt-0.5 shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <Button type="button" variant="outline" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            fullWidth
            loading={busy}
            disabled={code.length !== 4 || busy}
            leadingIcon={<ShieldCheck size={16} />}
          >
            Confirm
          </Button>
        </div>
      </form>

      <p className="mt-5 text-center text-caption text-ink-subtle">
        Your code identifies you in the audit trail. Never share it.
      </p>
    </Modal>
  );
}

/**
 * Convenience hook for a screen with several confirmable actions.
 *
 * The screen calls `confirm({ actionLabel, onConfirmed })` and renders
 * `<StaffCodeDialog {...dialogProps} />` once, rather than keeping its own
 * open/close state for every button.
 */
export function useStaffConfirm() {
  const [request, setRequest] = useState<StaffCodeRequest | null>(null);

  return {
    confirm: (next: StaffCodeRequest) => setRequest(next),
    dialogProps: { request, onClose: () => setRequest(null) },
  };
}
