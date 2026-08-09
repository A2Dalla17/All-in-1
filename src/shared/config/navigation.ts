import { Bike, ShoppingBag, Store, type LucideIcon } from 'lucide-react';

/**
 * The navigation model.
 *
 * Header, footer and the home page cards all read from this one array, so a
 * change lands everywhere at once. Duplicating the list is how a footer ends up
 * linking to something the header dropped a month ago.
 *
 * ── One product ────────────────────────────────────────────────────────────
 * AC7 GALEYR is a food delivery business in Mogadishu. Taxi, School Runs,
 * Bookings and Marketplace are gone from here entirely — not greyed out, not
 * "coming soon", gone.
 *
 * That is deliberate. A young company listing four services it does not yet
 * run reads as unfocused, and every one of those cards is a place for a
 * customer to click away from the thing that actually works. The taxi code
 * remains in the repository, paused; it is simply not something the website
 * offers.
 *
 * When Taxi returns it comes back here, as a real entry, with a route behind
 * it that works.
 */

export interface ServiceLink {
  id: 'restaurants' | 'couriers' | 'partners';
  label: string;
  labelSo?: string;
  to: string;
  icon: LucideIcon;
  tagline: string;
  description: string;
  cta: string;
  /* Retained so the footer's existing branches still type-check. Nothing is
     "coming soon" any more and nothing is external — but leaving the optional
     fields costs nothing and avoids editing a component that is otherwise
     correct. */
  href?: string;
  comingSoon?: boolean;
}

export const SERVICES: readonly ServiceLink[] = [
  {
    id: 'restaurants',
    label: 'Order food',
    labelSo: 'Dalbo cunto',
    to: '/restaurants',
    icon: ShoppingBag,
    tagline: 'Makhaayadaha Muqdisho',
    description:
      'Browse restaurants near you, order in a few taps, and pay the courier in cash when it arrives.',
    cta: 'See restaurants',
  },
  {
    id: 'couriers',
    label: 'Deliver with us',
    labelSo: 'Nala shaqee',
    to: '/couriers',
    icon: Bike,
    tagline: 'Ride with your own bike',
    description:
      'Choose your own hours, get paid for every delivery, and work with a control room that answers the phone.',
    cta: 'Become a courier',
  },
  {
    id: 'partners',
    label: 'Partner restaurants',
    labelSo: 'Iska diiwaan geli',
    to: '/partners',
    icon: Store,
    tagline: 'Sell more without a delivery team',
    description:
      'List your menu, receive orders through the control room, and let our couriers handle the rest.',
    cta: 'List your restaurant',
  },
];

export interface NavItem {
  label: string;
  to?: string;
  href?: string;
  comingSoon?: boolean;
  children?: readonly NavItem[];
}

/**
 * The header.
 *
 * ── Why it is flat ─────────────────────────────────────────────────────────
 * It used to have a Transport group with Taxi and School Runs folded inside a
 * submenu. With one product there is nothing to group, and a dropdown holding a
 * single item is a worse version of a link. Flat also means every destination
 * is one tap on a phone, which is where nearly all of this traffic will be.
 *
 * Restaurants leads, because browsing is the thing to do here.
 */
export const HEADER_NAV: readonly NavItem[] = [
  { label: 'Restaurants', to: '/restaurants' },
  { label: 'Track order', to: '/track' },
  { label: 'Become a courier', to: '/couriers' },
  { label: 'Partner with us', to: '/partners' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const LEGAL_NAV: readonly { label: string; to: string }[] = [
  { label: 'Privacy', to: '/privacy' },
  { label: 'Terms', to: '/terms' },
  { label: 'Cookies', to: '/cookies' },
];
