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

import '@shared/styles/index.css';

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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
