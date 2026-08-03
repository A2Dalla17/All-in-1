import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
// DEMO_MODE — delete this import with src/dev/.
import { ApiError } from '@/lib/http';
import { useAuth } from '@/providers/AuthProvider';
import { AuthShell } from './AuthShell';

/** Where each role lands after a successful sign-in. */
const HOME_FOR_ROLE = {
  rider: '/taxi/app',
  driver: '/taxi/driver',
  admin: '/admin',
} as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get('expired') ? 'Your session expired. Please sign in again.' : null,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      // Lowercase is required: the backend looks users up with a plain
      // `WHERE email = $1`, which is case-sensitive in Postgres. Typing
      // "Ghaalabh10@" would never match a stored "ghaalabh10@".
      const user = await login({ email: email.trim().toLowerCase(), password });

      // Return the user to wherever the guard intercepted them, if that
      // destination is still valid for their role.
      const intended = (location.state as { from?: string } | null)?.from;
      /* `user` is null when the Supabase sign-in succeeded but no
         public.users row is linked to it yet. The rider app is the safe
         landing spot: it is the least-privileged surface, and the guard
         there will bounce them onward once the profile appears. */
      const home = user ? HOME_FOR_ROLE[user.role] : '/taxi/app';
      navigate(intended ?? home, { replace: true });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.status === 401
            ? 'That email and password do not match.'
            : cause.userMessage
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to book a ride, track a trip, or manage your account."
      footer={
        <>
          New to AC7 Ride?{' '}
          <Link to="/taxi/register" className="font-semibold text-brand-ink hover:text-brand-hover">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
          >
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          leadingIcon={<Mail size={18} />}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          leadingIcon={<Lock size={18} />}
          trailingSlot={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-subtle transition-colors hover:bg-card hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          }
        />

        <div className="flex justify-end">
          <Link
            to="/taxi/forgot-password"
            className="text-sm font-medium text-brand-ink hover:text-brand-hover"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" size="lg" fullWidth loading={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      {/* DEMO_MODE — delete this line and the component below with src/dev/. */}
    </AuthShell>
  );
}

