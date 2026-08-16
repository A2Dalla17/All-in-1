/**
 * GALEYR — the business categories, landing-page copy.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * Galeyr is not a restaurant delivery company
 * ══════════════════════════════════════════════════════════════════════════
 * It delivers from businesses across Mogadishu — supermarkets, pharmacies,
 * cosmetics, electronics, warehouses. Restaurants are one category among
 * many, not the product.
 *
 * ── This file is a DELIBERATE DUPLICATE ───────────────────────────────────
 * The same registry exists in the customer app at
 * `enatega-multivendor-web/lib/galeyr/categories.ts`.
 *
 * They are separate repositories with different build tooling — a Vite app
 * cannot import from a Next app — so today there is no way to share it
 * without the `@galeyr/core` package that INTEGRATION_PLAN.md schedules for
 * Phase 5.
 *
 * Until that exists, THE TWO LISTS MUST BE KEPT IN STEP BY HAND. If a
 * category appears on the landing page and not in the customer app, a
 * customer clicks through to nothing. The customer app's copy is the one with
 * the extra machinery (icons, vocabulary, matching) and is the source of
 * truth; this file carries only what the landing page renders.
 *
 * Slugs must match exactly — they are the link between the two apps.
 */

export interface LandingCategory {
  /** Must match the customer app's slug. This is the whole contract. */
  slug: string;
  label: string;
  /** Somali. The launch market reads this first. */
  labelSo: string;
  blurb: string;
}

export const GALEYR_CATEGORIES: LandingCategory[] = [
  { slug: 'restaurants',  label: 'Restaurants',  labelSo: 'Makhaayadaha',      blurb: 'Hot food, cooked to order' },
  { slug: 'supermarkets', label: 'Supermarkets', labelSo: 'Suubarmaarkeyada',  blurb: 'Your weekly shop, delivered' },
  { slug: 'grocery',      label: 'Grocery',      labelSo: 'Baqaal',            blurb: 'Fresh food from local shops' },
  { slug: 'pharmacy',     label: 'Pharmacy',     labelSo: 'Farmashiyaha',      blurb: 'Medicine and health essentials' },
  { slug: 'cosmetics',    label: 'Beauty & Cosmetics',    labelSo: 'Qurxinta & Suuqa Quruxda',          blurb: 'Skincare, makeup and perfume' },
  { slug: 'electronics',  label: 'Electronics',  labelSo: 'Qalabka Korontada', blurb: 'Phones, computers, accessories' },
  { slug: 'shops',        label: 'Shops',        labelSo: 'Dukaamada',         blurb: 'Local shops near you' },
  { slug: 'clothing',     label: 'Clothing',     labelSo: 'Dharka',            blurb: 'Clothes, shoes and fabric' },
  { slug: 'bakery',       label: 'Bakery',       labelSo: 'Rooti-dubka',       blurb: 'Bread, cakes and pastries' },
  { slug: 'butchers',     label: 'Butchers',     labelSo: 'Hilibleyaasha',     blurb: 'Fresh meat, cut to order' },
  { slug: 'household',    label: 'Household',    labelSo: 'Alaabta Guriga',    blurb: 'Everything for the home' },
  { slug: 'warehouses',   label: 'Warehouses',   labelSo: 'Bakhaarrada',       blurb: 'Buy in bulk, direct' },
];
