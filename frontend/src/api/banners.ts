import { supabase, friendlyError, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Community advertising — the showcase carousel under the hero.
 *
 * ── One slot became several ────────────────────────────────────────────────
 * The homepage used to show a single banner. It now rotates through everything
 * live: featured businesses, restaurant and shop promotions, seasonal
 * campaigns, company announcements, and the Driver of the Quarter. `priority`
 * still decides who leads; `sort_order` decides reading order among equals.
 *
 * ── Why the spotlight window is derived, not scheduled ─────────────────────
 * For the first few days of each calendar quarter the Driver of the Quarter is
 * promoted to the front of the rotation. That window is computed from the date
 * on every page load rather than flipped by a scheduled job, because a cron
 * that fails silently leaves last quarter's winner leading the homepage for
 * three months and nobody notices until a customer mentions it.
 */

export type BannerKind =
  | 'advert'
  | 'promotion'
  | 'featured_business'
  | 'restaurant_promotion'
  | 'shop_promotion'
  | 'driver_of_quarter'
  | 'seasonal_campaign'
  | 'announcement';

export interface FeaturedBanner {
  id: string;
  kind: BannerKind;
  title: string;
  subtitle: string | null;
  body: string | null;
  image_url: string | null;
  cta_label: string | null;
  cta_href: string | null;
  priority: number;
  sort_order: number;
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
}

/** The eyebrow shown above each slide's title. */
export const KIND_LABEL: Record<BannerKind, string> = {
  advert: 'Featured',
  promotion: 'Promotion',
  featured_business: 'Featured business',
  restaurant_promotion: 'Restaurant promotion',
  shop_promotion: 'Shop promotion',
  driver_of_quarter: 'Driver of the Quarter',
  seasonal_campaign: 'Seasonal campaign',
  announcement: 'Announcement',
};

/** How many slides the carousel will show at most. */
const MAX_SLIDES = 6;

/** How long the new quarter's spotlight leads the rotation. */
export const SPOTLIGHT_DAYS = 3;

export interface Quarter {
  index: number;
  label: string;
  start: Date;
  /** Exclusive — the instant the next quarter begins. */
  end: Date;
}

export function quarterFor(now: Date = new Date()): Quarter {
  const index = Math.floor(now.getMonth() / 3);
  return {
    index: index + 1,
    label: `Q${index + 1} ${now.getFullYear()}`,
    start: new Date(now.getFullYear(), index * 3, 1, 0, 0, 0, 0),
    end: new Date(now.getFullYear(), index * 3 + 3, 1, 0, 0, 0, 0),
  };
}

/** True during the opening days of a quarter, when the spotlight leads. */
export function isSpotlightWindow(now: Date = new Date()): boolean {
  const elapsedDays = (now.getTime() - quarterFor(now).start.getTime()) / 86_400_000;
  return elapsedDays >= 0 && elapsedDays < SPOTLIGHT_DAYS;
}

/* -------------------------------------------------------------------------- */

export const bannersApi = {
  /**
   * Everything currently live, ordered for the carousel.
   *
   * The RLS policy already filters to rows that are active and inside their
   * date range, so this does not repeat those conditions — duplicating them
   * would mean two places to change when the rule changes.
   *
   * An empty list is an ordinary outcome, not an error: a new site has no
   * advertisers yet. The component handles that by showing the invitation to
   * advertise rather than a gap.
   */
  async showcase(now: Date = new Date()): Promise<FeaturedBanner[]> {
    if (!isSupabaseConfigured) return [];

    const { data, error } = await supabase
      .from('featured_banners')
      .select('*')
      .order('priority', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('starts_at', { ascending: false })
      .limit(MAX_SLIDES);

    if (error) throw new Error(friendlyError(error));

    const live = (data ?? []) as FeaturedBanner[];
    if (live.length === 0) return [];

    /* Outside its window the quarterly driver stays in the rotation but does
       not lead it, so a paid campaign is not buried behind a spotlight that
       ran three months ago. */
    if (isSpotlightWindow(now)) return live;

    const spotlight = live.filter((b) => b.kind === 'driver_of_quarter');
    const rest = live.filter((b) => b.kind !== 'driver_of_quarter');
    return [...rest, ...spotlight];
  },
};

/* -------------------------------------------------------------------------- */
/* Admin                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Everything below is admin-only, and that is enforced by row level security
 * on the server — not by hiding the screen. A non-admin calling these gets
 * zero rows or a permission error from Postgres, which is the correct place
 * for the check to live.
 */

export interface BannerInput {
  kind: BannerKind;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  image_url: string | null;
  is_active: boolean;
  priority: number;
  sort_order: number;
  ends_at: string | null;
}

const BUCKET = 'banners';

export const bannersAdminApi = {
  /** Every banner, live or not, newest first. */
  async list(): Promise<FeaturedBanner[]> {
    const { data, error } = await supabase
      .from('featured_banners')
      .select('*')
      .order('priority', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw new Error(friendlyError(error));
    return (data ?? []) as FeaturedBanner[];
  },

  /**
   * Upload artwork and return its public URL.
   *
   * The filename is randomised rather than taken from the upload. Two shops
   * both sending "logo.jpg" would otherwise collide, and a filename chosen by
   * an uploader is a small attack surface for path tricks.
   */
  async uploadImage(blob: Blob, extension: string): Promise<string> {
    const name = `${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage.from(BUCKET).upload(name, blob, {
      contentType: blob.type,
      /* One year: the filename is unique per upload, so a cached copy can
         never be stale — replacing an image always produces a new URL. */
      cacheControl: '31536000',
      upsert: false,
    });

    if (error) throw new Error(friendlyError(error));

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(name);
    return data.publicUrl;
  },

  async create(input: BannerInput): Promise<FeaturedBanner> {
    const { data, error } = await supabase
      .from('featured_banners')
      .insert(input)
      .select()
      .single();

    if (error) throw new Error(friendlyError(error));
    return data as FeaturedBanner;
  },

  async update(id: string, patch: Partial<BannerInput>): Promise<FeaturedBanner> {
    const { data, error } = await supabase
      .from('featured_banners')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(friendlyError(error));
    return data as FeaturedBanner;
  },

  async setActive(id: string, is_active: boolean) {
    return this.update(id, { is_active });
  },

  /**
   * Remove a banner and its artwork.
   *
   * The row goes first. If the image delete fails afterwards the advert has
   * still disappeared from the site, which is what the admin asked for — an
   * orphaned file in storage is tidy-up, not a failure worth reporting.
   */
  async remove(banner: FeaturedBanner): Promise<void> {
    const { error } = await supabase.from('featured_banners').delete().eq('id', banner.id);
    if (error) throw new Error(friendlyError(error));

    const path = banner.image_url?.split(`/${BUCKET}/`)[1];
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
  },
};
