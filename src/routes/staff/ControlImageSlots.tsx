/**
 * Image spaces — create, shape and fill them, without touching code.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The problem this solves
 * ══════════════════════════════════════════════════════════════════════════
 * "I want another picture on that page" used to mean a developer, an edit and
 * a deploy. Here it means: choose the page, choose the shape, drop in a
 * picture. The customer app renders whatever exists.
 *
 * ── Codes are assigned by the database, never here ────────────────────────
 * A1, A2, A3 … Two people adding a space at the same moment would both read
 * "the highest is A4" and both write A5, and then nobody can tell which
 * picture is which — which defeats the whole point of naming them. The RPC
 * takes the maximum inside the insert, so that cannot happen.
 *
 * ── Why the preview is drawn in perspective ───────────────────────────────
 * Choosing "tall, medium" from two dropdowns tells you nothing about what you
 * will get. Tilting the shape and giving it depth makes it read as a physical
 * thing occupying space on a page, which is the question actually being
 * asked: how big is this, and what shape.
 *
 * It is a sketch, not a simulation. It shows proportion and relative size
 * honestly and does not pretend to be a screenshot — a preview that looks
 * exactly like the app but is subtly wrong is worse than one that is
 * obviously a diagram.
 */

import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { Input } from '@shared/components/ui/Input';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  imageSlotsApi,
  SHAPE_LABEL,
  SHAPE_RATIO,
  SIZE_LABEL,
  SLOT_PAGES,
  SLOT_SHAPES,
  SLOT_SIZES,
  type ImageSlot,
  type SlotShape,
  type SlotSize,
} from '@shared/api/imageSlots';
import { cn } from '@shared/lib/utils';

/** Preview width per size, in px. Proportional, not literal. */
const SIZE_WIDTH: Record<SlotSize, number> = { small: 96, medium: 140, large: 190 };

function pageLabel(page: string): string {
  return SLOT_PAGES.find((p) => p.value === page)?.label ?? page;
}

/**
 * The perspective sketch of a space.
 *
 * Used both in the create dialog and on each card, so what staff choose and
 * what they later see are drawn by the same component and cannot disagree.
 */
function SpacePreview({
  shape,
  size,
  imageUrl,
  code,
}: {
  shape: SlotShape;
  size: SlotSize;
  imageUrl?: string | null;
  code?: string;
}) {
  const width = SIZE_WIDTH[size];

  return (
    <div
      className="grid place-items-center py-4"
      style={{ perspective: '640px' }}
      aria-hidden
    >
      <div
        className="relative rounded-tile border border-line bg-surface shadow-lifted transition-transform duration-300"
        style={{
          width,
          aspectRatio: SHAPE_RATIO[shape],
          transform: 'rotateX(14deg) rotateY(-16deg)',
          transformStyle: 'preserve-3d',
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!imageUrl && (
          <span className="absolute inset-0 grid place-items-center text-caption text-ink-subtle">
            {SHAPE_LABEL[shape]}
          </span>
        )}

        {code && (
          <span className="absolute left-1 top-1 rounded bg-ink/60 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">
            {code}
          </span>
        )}

        {/* The slab edge. One face only — this is a sketch, and a full box
            would draw attention to the drawing instead of the shape. */}
        <span
          className="absolute inset-y-0 right-0 w-2 rounded-r-tile bg-ink/15"
          style={{ transform: 'rotateY(90deg) translateZ(4px)', transformOrigin: 'right' }}
        />
      </div>
    </div>
  );
}

export function ControlImageSlots() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{
    page: string;
    section: string;
    shape: SlotShape;
    size: SlotSize;
  }>({ page: 'home', section: '', shape: 'wide', size: 'small' });

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const query = useQuery({ queryKey: ['image-slots'], queryFn: imageSlotsApi.list });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['image-slots'] });
  }

  const create = useMutation({
    mutationFn: () =>
      imageSlotsApi.create({
        page: draft.page,
        section: draft.section || null,
        shape: draft.shape,
        size: draft.size,
      }),
    onSuccess: () => {
      invalidate();
      setCreating(false);
      setDraft({ page: 'home', section: '', shape: 'wide', size: 'small' });
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Could not add the space.'),
  });

  const remove = useMutation({
    mutationFn: (id: string) => imageSlotsApi.remove(id),
    onSuccess: invalidate,
  });

  async function upload(slot: ImageSlot, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    setBusyId(slot.id);
    try {
      const url = await imageSlotsApi.uploadImage(file);
      await imageSlotsApi.update(slot.id, { image_url: url });
      invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The image could not be uploaded.');
    } finally {
      setBusyId(null);
      const el = inputs.current[slot.id];
      if (el) el.value = '';
    }
  }

  const slots = query.data ?? [];

  /* Grouped by page so somebody scanning for "the picture on the home page"
     is not reading a flat list of twenty codes. */
  const byPage = useMemo(() => {
    const groups = new Map<string, ImageSlot[]>();
    for (const slot of slots) {
      const list = groups.get(slot.page) ?? [];
      list.push(slot);
      groups.set(slot.page, list);
    }
    return [...groups.entries()];
  }, [slots]);

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading image spaces" />
      </div>
    );
  }

  const filled = slots.filter((s) => s.image_url).length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-body-sm text-ink-muted">
            {slots.length} space{slots.length === 1 ? '' : 's'} · {filled} with a picture
          </p>
          <p className="mt-0.5 text-caption text-ink-subtle">
            Each space shows its code in the corner on the customer app. See A7 there,
            open A7 here.
          </p>
        </div>

        <Button leadingIcon={<Plus size={16} />} onClick={() => setCreating(true)}>
          Add a space
        </Button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-input bg-danger-soft p-3 text-body-sm text-danger">
          {error}
        </p>
      )}

      {slots.length === 0 && (
        <div className="mt-8 rounded-panel border border-dashed border-line p-10 text-center">
          <p className="font-semibold text-ink">No image spaces yet</p>
          <p className="mx-auto mt-2 max-w-sm text-body-sm text-ink-muted">
            Add one, choose which page it sits on and what shape it is, then drop a
            picture in. It appears in the customer app straight away.
          </p>
        </div>
      )}

      {byPage.map(([page, pageSlots]) => (
        <section key={page} className="mt-8">
          <h3 className="text-body-sm font-semibold text-ink">{pageLabel(page)}</h3>
          <p className="text-caption text-ink-subtle">
            {pageSlots.length} space{pageSlots.length === 1 ? '' : 's'}
          </p>

          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageSlots.map((slot) => (
              <li key={slot.id} className="rounded-panel border border-line bg-card p-4 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <span className="grid h-8 min-w-10 place-items-center rounded-tile bg-brand px-2 text-body-sm font-extrabold text-white">
                    {slot.code}
                  </span>
                  <span className="text-caption text-ink-subtle">
                    {SHAPE_LABEL[slot.shape]} · {SIZE_LABEL[slot.size]}
                  </span>
                </div>

                {slot.section && (
                  <p className="mt-2 truncate text-caption text-ink-muted">{slot.section}</p>
                )}

                <SpacePreview
                  shape={slot.shape}
                  size={slot.size}
                  imageUrl={slot.image_url}
                  code={slot.code}
                />

                <input
                  ref={(el) => { inputs.current[slot.id] = el; }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  onChange={(e) => void upload(slot, e)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={slot.image_url ? 'outline' : 'primary'}
                    loading={busyId === slot.id}
                    leadingIcon={
                      busyId === slot.id
                        ? <Loader2 size={14} className="animate-spin" />
                        : <ImagePlus size={14} />
                    }
                    onClick={() => inputs.current[slot.id]?.click()}
                  >
                    {slot.image_url ? 'Replace' : 'Add image'}
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    leadingIcon={<Trash2 size={14} />}
                    onClick={() => remove.mutate(slot.id)}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Add an image space"
      >
        <div className="space-y-5">
          {/* The preview leads, because it is the answer to the question the
              two dropdowns are asking. */}
          <div className="rounded-panel border border-line bg-surface">
            <SpacePreview shape={draft.shape} size={draft.size} />
            <p className="pb-3 text-center text-caption text-ink-subtle">
              Roughly how it will sit on the page
            </p>
          </div>

          <div>
            <label htmlFor="slot-page" className="mb-1.5 block text-body-sm font-semibold text-ink">
              Which page
            </label>
            <select
              id="slot-page"
              value={draft.page}
              onChange={(e) => setDraft((d) => ({ ...d, page: e.target.value }))}
              className="h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
            >
              {SLOT_PAGES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          <Input
            label="Where on the page (optional)"
            placeholder="Under the categories"
            value={draft.section}
            onChange={(e) => setDraft((d) => ({ ...d, section: e.target.value }))}
          />

          <div>
            <span className="mb-2 block text-body-sm font-semibold text-ink">Shape</span>
            <div className="flex flex-wrap gap-2">
              {SLOT_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, shape }))}
                  className={cn(
                    'rounded-control px-4 py-2 text-body-sm font-semibold transition-colors',
                    draft.shape === shape
                      ? 'bg-brand text-white'
                      : 'bg-surface text-ink-muted hover:bg-line',
                  )}
                >
                  {SHAPE_LABEL[shape]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-body-sm font-semibold text-ink">Size</span>
            <div className="flex flex-wrap gap-2">
              {SLOT_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, size }))}
                  className={cn(
                    'rounded-control px-4 py-2 text-body-sm font-semibold transition-colors',
                    draft.size === size
                      ? 'bg-brand text-white'
                      : 'bg-surface text-ink-muted hover:bg-line',
                  )}
                >
                  {SIZE_LABEL[size]}
                </button>
              ))}
            </div>
          </div>

          <p className="text-caption text-ink-subtle">
            The code is given automatically — the next one after your last space.
          </p>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" fullWidth onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button fullWidth loading={create.isPending} onClick={() => create.mutate()}>
              Add space
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
