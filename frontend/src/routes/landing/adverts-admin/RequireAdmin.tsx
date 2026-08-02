import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { Container } from '@/components/ui/Container';
import { useAuth } from '@/providers/AuthProvider';

/**
 * Gate for the admin console.
 *
 * ── This is navigation, not security ───────────────────────────────────────
 * Anyone can edit the JavaScript in their own browser and render whatever
 * component they like. What actually protects the adverts is row level
 * security in Postgres and the storage policies on the bucket: a non-admin who
 * forced their way to this screen would see an empty list and get a permission
 * error on every write.
 *
 * So this exists to stop honest people landing somewhere confusing, and for no
 * other reason. Never move a real authorisation decision here.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin, isLoading } = useAuth();
  const location = useLocation();

  /* Waiting matters. Redirecting while the session is still resolving bounces
     a signed-in admin to the login page on every hard refresh. */
  if (isLoading) {
    return (
      <Container className="py-24">
        <p className="text-center text-body text-ink-muted" aria-busy="true">
          Checking your access…
        </p>
      </Container>
    );
  }

  if (!session) {
    return <Navigate to="/admin" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return (
      <Container size="narrow" className="py-24 text-center">
        <h1 className="text-h2 text-ink">You do not have access to this area</h1>
        <p className="mx-auto mt-3 max-w-md text-body leading-relaxed text-ink-muted">
          This account is signed in, but it is not an administrator. Ask an existing admin to
          grant access.
        </p>
      </Container>
    );
  }

  return <>{children}</>;
}
