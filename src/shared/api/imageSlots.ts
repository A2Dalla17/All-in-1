/**
 * GALEYR — image spaces.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * What these are for
 * ══════════════════════════════════════════════════════════════════════════
 * A space is a picture-shaped hole on a page in the customer app that the
 * control room owns. Staff create one, choose which page it sits on and what
 * shape it is, and drop a picture in. No code, no deploy.
 *
 * Each space gets a code — A1, A2, A3 — assigned by the database. That code
 * is printed in the corner of the picture in the customer app, so somebody
 * who sees a wrong picture can come straight here and open the right one.
 *
 * ── Not the same thing as an advert ───────────────────────────────────────
 * `featured_banners` holds community advertising: paid campaigns with a
 * title, a call to action and a run of dates. A space has none of those. It
 * is furniture, not a campaign, which is why it has its own table.
 */

import { supabase, unwrap } from '@shared/lib/supabase';

/** Shapes a space can take. Drives both the Control Centre preview and the
 *  real rendering, so what staff pick is what they get. */
export const SLOT_SHAPES = ['wide', 'square', 'tall', 'banner'] as const;
export type SlotShape = (typeof SLOT_SHAPES)[number];

export const SLOT_SIZES = ['small', 'medium', 'large'] as const;
export type SlotSize = (typeof SLOT_SIZES)[number];

/** CSS aspect ratio per shape — the single source both apps read. */
export const SHAPE_RATIO: Record<SlotShape, string> = {
  wide: '16 / 9',
  square: '1 / 1',
  tall: '3 / 4',
  banner: '21 / 6',
};

export const SHAPE_LABEL: Record<SlotShape, string> = {
  wide: 'Wide',
  square: 'Square',
  tall: 'Tall',
  banner: 'Banner',
};

export const SIZE_LABEL: Record<SlotSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

/**
 * Pages a space can be placed on.
 *
 * A suggestion list, not a constraint. The column is free text precisely so
 * that a page invented next month does not need a database migration before
 * it can hold a picture.
 */
export const SLOT_PAGES: { value: string; label: string }[] = [
  { value: 'home', label: 'Customer home' },
  { value: 'restaurants', label: 'All businesses' },
  { value: 'categories', label: 'All categories' },
  { value: 'track', label: 'Track your order' },
  { value: 'partner', label: 'Become Our Partner' },
  { value: 'courier', label: 'Become a courier' },
];

export interface ImageSlot {
  id: string;
  code: string;
  page: string;
  section: string | null;
  shape: SlotShape;
  size: SlotSize;
  sort_order: number;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
}

const BUCKET = 'banners';

export const imageSlotsApi = {
  /** Every space, empty ones included. Staff view. */
  async list(): Promise<ImageSlot[]> {
    return unwrap(
      await supabase
        .from('galeyr_image_slots')
        .select('*')
        .order('sort_order', { ascending: true }),
    ) as ImageSlot[];
  },

  /**
   * Add a space. The code comes back from the database.
   *
   * Deliberately an RPC rather than an insert: two people adding a space at
   * the same moment would both read "the highest is A4" and both write A5.
   * The function takes the maximum inside the insert, so that cannot happen.
   */
  async create(input: {
    page: string;
    section?: string | null;
    shape: SlotShape;
    size: SlotSize;
  }): Promise<ImageSlot> {
    const { data, error } = await supabase.rpc('galeyr_create_image_slot', {
      p_page: input.page,
      p_section: input.section ?? null,
      p_shape: input.shape,
      p_size: input.size,
    });
    if (error) throw new Error(error.message);
    return data as ImageSlot;
  },

  async update(id: string, patch: Partial<ImageSlot>): Promise<void> {
    const { error } = await supabase
      .from('galeyr_image_slots')
      .update(patch)
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('galeyr_image_slots').delete().eq('id', id);
    if (error) throw new Error(error.message);
  },

  /**
   * Upload artwork and return its public URL.
   *
   * Shares the `banners` bucket with community advertising — same kind of
   * content, same public-read policy, and one fewer bucket to keep policies
   * in step across.
   *
   * The filename is generated. Never the uploader's: `../../x.png` is a path
   * traversal attempt, and two people uploading `banner.jpg` would collide.
   */
  async uploadImage(file: File): Promise<string> {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
    if (!allowed.includes(file.type)) {
      throw new Error('Use a JPG, PNG or WebP image.');
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(
        `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`,
      );
    }

    const ext = (file.type.split('/')[1] ?? 'jpg').replace('jpeg', 'jpg');
    const name = `slot-${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(name, file, { cacheControl: '31536000', upsert: false });
    if (error) throw new Error(error.message);

    return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  },
};
