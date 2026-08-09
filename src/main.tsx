/**
 * AC7 — landing website entry point.
 *
 * Separate from the application's entry on purpose. This bundle contains the
 * marketing site and nothing else: no rider screens, no driver dashboard, no
 * map engine, no booking flow. A visitor reading the pricing page downloads a
 * pricing page.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/* ══════════════════════════════════════════════════════════════════════════
   The typeface
   ══════════════════════════════════════════════════════════════════════════
   Inter was named in the Tailwind config from the beginning and never actually
   loaded, so every screen has been rendering in whatever the operating system
   defaults to — Segoe UI on Windows, Roboto on Android. That single omission is
   most of why the site read as a generic template: the type scale, the tracking
   and the optical sizes were all tuned for a typeface that was not there.

   Self-hosted through fontsource rather than linked from Google Fonts. Two
   reasons, both of which matter more here than usual: no third-party request on
   a connection where every round trip is expensive, and no visitor data sent to
   a third party just to render text.

   The variable font is one file covering every weight, which is smaller than
   the three static weights this design uses. */
import '@fontsource-variable/inter';

import '@shared/styles/index.css';

import { AuthProvider } from '@shared/providers/AuthProvider';

import { IntroGate } from '@/components/brand/IntroGate';

import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* The site's only live data is the advert showcase, which changes rarely.
         Refetching it when someone tabs back to the page is pure noise. */
      refetchOnWindowFocus: false,
      staleTime: 5 * 60_000,
      retry: 1,
    },
  },
});

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Wraps everything, but costs a visitor almost nothing: with no stored
          session it resolves to "signed out" on the first check and never
          calls the network again. Only the restaurant portal and the control
          room read from it. */}
      <AuthProvider>
        {/* Outside BrowserRouter on purpose. The gate reads window.location
            directly and needs to decide before any route renders — putting it
            inside the router would mean the homepage mounts, then unmounts
            behind the overlay, which is the flicker the whole thing exists to
            avoid. */}
        <IntroGate>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </IntroGate>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
