/**
 * Community Advertising management.
 *
 * ── Where this lives, and why it matters that it is here ───────────────────
 * The homepage billboard is inventory GALEYR sells. Whoever is in the control
 * room is the person a business rings about it, so the tools to put a campaign
 * live belong on the same screen as the orders — not in a separate admin
 * console someone has to remember exists.
 *
 * ── Nothing here is the security boundary ──────────────────────────────────
 * Every write goes through `featured_banners_manage`, whose USING clause is
 * `can_manage_adverts()`. A non-admin who reaches this screen sees the form and
 * gets a permission error from Postgres the moment they save. The check is in
 * the database because that is the only place a browser cannot edit it.
 */

import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, Eye, EyeOff, Film, ImagePlus, Loader2, Pencil, Plus, Trash2,
} from 'lucide-react';

import { Button } from '@shared/components/ui/Button';
import { EmptyState } from '@shared/components/ui/EmptyState';
import { Input, Textarea } from '@shared/components/ui/Input';
import { Modal } from '@shared/components/ui/Modal';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  bannersAdminApi,
  KIND_LABEL,
  MAX_VIDEO_BYTES,
  type BannerInput,
  type BannerKind,
  type FeaturedBanner,
} from '@shared/api/banners';
import { env } from '@shared/config/env';
import { cn } from '@shared/lib/utils';

const KINDS = Object.keys(KIND_LABEL) as BannerKind[];

/** A blank campaign. Inactive by default — see the note on the form. */
function emptyBanner(): BannerInput {
  return {
    kind: 'advert',
    title: '',
    subtitle: null,
    cta_label: null,
    cta_href: null,
    image_url: null,
    media_type: 'image',
    poster_url: null,
    /* Off until somebody looks at it. A campaign that goes live the instant a
       half-finished form is saved puts an untitled advert on the homepage of a
       business that is trying to look serious. */
    is_active: false,
    priority: 10,
    sort_order: 0,
    ends_at: null,
  };
}

import { ControlImageSlots } from './ControlImageSlots';

type AdvertTab = 'adverts' | 'images';

/**
 * Two products, two tabs.
 *
 * Community Advertising is paid inventory — campaigns with a title, a call to
 * action and dates, shown large on the customer home page.
 *
 * Images are fixed slots A1–A6 — artwork only, small, and named so that
 * somebody who sees a wrong picture in the app knows exactly which one to
 * open. They are separated because they are different jobs done by different
 * people at different times, not because the data differs.
 */
export function ControlAdvertsScreen() {
  const [tab, setTab] = useState<AdvertTab>('adverts');

  return (
    <div>
      <nav aria-label="Advertising sections" className="mb-6 flex gap-1 border-b border-line">
        {([
          { id: 'adverts', label: 'Community Advertising' },
          { id: 'images', label: 'Images' },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 px-4 py-3 text-body-sm font-semibold transition-colors',
              tab === item.id
                ? 'border-brand text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'adverts' ? <ControlAdverts /> : <ControlImageSlots />}
    </div>
  );
}

export function ControlAdverts() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ id?: string; values: BannerInput } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeaturedBanner | null>(null);

  const query = useQuery({
    queryKey: ['banners', 'admin'],
    queryFn: bannersAdminApi.list,
  });

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['banners'] });
  }

  const save = useMutation({
    mutationFn: ({ id, values }: { id?: string; values: BannerInput }) =>
      id ? bannersAdminApi.update(id, values) : bannersAdminApi.create(values),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      bannersAdminApi.setActive(id, active),
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: (banner: FeaturedBanner) => bannersAdminApi.remove(banner),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(null);
    },
  });

  if (query.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" label="Loading campaigns" />
      </div>
    );
  }

  /* Image spaces used to live in this table and had to be filtered out here.
     They now have their own table, so every row in featured_banners is an
     advert and no filter is needed. */
  const banners = query.data ?? [];
  const live = banners.filter((b) => b.is_active).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-body-sm text-ink-muted">
            {live} live on the homepage · {banners.length} total
          </p>
          <p className="mt-0.5 text-caption text-ink-subtle">
            Highest priority leads the rotation. Sort order breaks ties.
          </p>
        </div>

        <Button
          leadingIcon={<Plus size={16} />}
          onClick={() => setEditing({ values: emptyBanner() })}
        >
          New campaign
        </Button>
      </div>

      {banners.length === 0 && (
        <EmptyState
          className="py-16"
          icon={<ImagePlus size={28} />}
          title="No campaigns yet"
          description="The homepage billboard is showing the invitation to advertise. Add a campaign and it takes that place."
          action={
            <Button onClick={() => setEditing({ values: emptyBanner() })}>
              Add the first campaign
            </Button>
          }
        />
      )}

      <div className="mt-6 space-y-3">
        {banners.map((banner) => (
          <article
            key={banner.id}
            className={cn(
              'flex flex-wrap items-center gap-4 rounded-card border bg-card p-4',
              banner.is_active ? 'border-line' : 'border-line opacity-70',
            )}
          >
            {/* A thumbnail of the actual artwork. Reading a list of campaign
                titles tells you nothing about which one is the photograph with
                the bad crop. */}
            <span className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-tile bg-surface">
              {banner.image_url ? (
                banner.media_type === 'video' ? (
                  <span className="relative h-full w-full">
                    {banner.poster_url ? (
                      <img
                        src={banner.poster_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <Film
                      size={16}
                      aria-hidden
                      className="absolute bottom-1 right-1 text-white drop-shadow"
                    />
                  </span>
                ) : (
                  <img src={banner.image_url} alt="" className="h-full w-full object-cover" />
                )
              ) : (
                <ImagePlus size={18} aria-hidden className="text-ink-subtle" />
              )}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-bold text-ink">
                  {banner.title || 'Untitled campaign'}
                </h3>
                <span className="inline-flex items-center gap-1 rounded-pill bg-brand-soft px-2 py-0.5 text-caption font-semibold text-brand-ink">
                  {banner.kind === 'courier_of_quarter' && <Award size={11} aria-hidden />}
                  {KIND_LABEL[banner.kind] ?? banner.kind}
                </span>
                {banner.is_active ? (
                  <span className="rounded-pill bg-success-soft px-2 py-0.5 text-caption font-bold text-success-ink">
                    Live
                  </span>
                ) : (
                  <span className="rounded-pill bg-surface px-2 py-0.5 text-caption font-bold text-ink-subtle">
                    Draft
                  </span>
                )}
              </div>

              {banner.subtitle && (
                <p className="truncate text-body-sm text-ink-muted">{banner.subtitle}</p>
              )}

              <p className="mt-0.5 text-caption text-ink-subtle">
                Priority {banner.priority} · order {banner.sort_order}
                {banner.ends_at &&
                  ` · ends ${new Date(banner.ends_at).toLocaleDateString(env.locale)}`}
              </p>
            </div>

            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                leadingIcon={banner.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                loading={toggle.isPending && toggle.variables?.id === banner.id}
                onClick={() =>
                  toggle.mutate({ id: banner.id, active: !banner.is_active })
                }
              >
                {banner.is_active ? 'Pause' : 'Publish'}
              </Button>

              <button
                type="button"
                onClick={() =>
                  setEditing({
                    id: banner.id,
                    values: {
                      kind: banner.kind,
                      title: banner.title,
                      subtitle: banner.subtitle,
                      cta_label: banner.cta_label,
                      cta_href: banner.cta_href,
                      image_url: banner.image_url,
                      media_type: banner.media_type,
                      poster_url: banner.poster_url,
                      is_active: banner.is_active,
                      priority: banner.priority,
                      sort_order: banner.sort_order,
                      ends_at: banner.ends_at,
                    },
                  })
                }
                aria-label={`Edit ${banner.title}`}
                className="rounded-tile p-2 text-ink-muted hover:bg-surface hover:text-ink"
              >
                <Pencil size={16} aria-hidden />
              </button>

              <button
                type="button"
                onClick={() => setConfirmDelete(banner)}
                aria-label={`Delete ${banner.title}`}
                className="rounded-tile p-2 text-ink-muted hover:bg-surface hover:text-danger"
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </article>
        ))}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit campaign' : 'New campaign'}
        size="lg"
      >
        {editing && (
          <BannerForm
            initial={editing.values}
            busy={save.isPending}
            error={save.isError ? save.error.message : ''}
            onCancel={() => setEditing(null)}
            onSave={(values) => save.mutate({ ...(editing.id ? { id: editing.id } : {}), values })}
          />
        )}
      </Modal>

      <Modal
        open={confirmDelete !== null}
        onClose={() => setConfirmDelete(null)}
        title={`Delete "${confirmDelete?.title ?? 'campaign'}"?`}
      >
        <p className="text-body text-ink-muted">
          The campaign and its uploaded artwork are removed. This cannot be undone — if you
          only want it off the homepage for now, pause it instead.
        </p>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setConfirmDelete(null)}>
            Keep it
          </Button>
          <Button
            variant="danger"
            fullWidth
            loading={remove.isPending}
            onClick={() => confirmDelete && remove.mutate(confirmDelete)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function BannerForm({
  initial,
  busy,
  error,
  onCancel,
  onSave,
}: {
  initial: BannerInput;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onSave: (values: BannerInput) => void;
}) {
  const [values, setValues] = useState<BannerInput>(initial);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  function set<K extends keyof BannerInput>(key: K, value: BannerInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  /**
   * Upload artwork.
   *
   * Photos and video go down different paths — video is size-checked and has a
   * poster frame captured from it in the browser — but the person filling this
   * in should not have to know that. One button, and the file's own type
   * decides.
   */
  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      if (file.type.startsWith('video/')) {
        const { url, posterUrl } = await bannersAdminApi.uploadVideo(file);
        setValues((c) => ({
          ...c,
          image_url: url,
          media_type: 'video',
          poster_url: posterUrl,
        }));
      } else {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const url = await bannersAdminApi.uploadImage(file, ext);
        setValues((c) => ({ ...c, image_url: url, media_type: 'image', poster_url: null }));
      }
    } catch (caught) {
      setUploadError(caught instanceof Error ? caught.message : 'That upload failed.');
    } finally {
      setUploading(false);
      /* Reset, so choosing the same file again after a failure still fires
         a change event. */
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  const valid = values.title.trim().length >= 2;

  return (
    <div className="space-y-5">
      {/* ── Artwork first ──
          This is a billboard. The picture is the product and the words are
          captions, so the upload leads rather than sitting at the bottom of a
          form behind six text fields. */}
      <div>
        <p className="mb-2 text-body-sm font-semibold text-ink">Artwork</p>

        <div className="overflow-hidden rounded-card border border-line bg-surface">
          <div className="relative aspect-[2.4/1] w-full">
            {values.image_url ? (
              values.media_type === 'video' ? (
                <video
                  src={values.image_url}
                  poster={values.poster_url ?? undefined}
                  muted
                  loop
                  playsInline
                  autoPlay
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={values.image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="grid h-full place-items-center text-ink-subtle">
                <ImagePlus size={26} aria-hidden />
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 grid place-items-center bg-black/50 text-white">
                <Loader2 size={26} className="animate-spin" aria-hidden />
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          {/* The input stays hidden and a real button drives it. A <label>
              wrapping a styled span would also work, but a button is focusable
              and announces itself as a button — a label around non-form content
              is neither. */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/mp4,video/webm"
            onChange={(e) => void handleFile(e)}
            className="sr-only"
            tabIndex={-1}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            leadingIcon={<ImagePlus size={15} />}
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {values.image_url ? 'Replace' : 'Upload photo or video'}
          </Button>

          {values.image_url && (
            <button
              type="button"
              onClick={() =>
                setValues((c) => ({ ...c, image_url: null, poster_url: null, media_type: 'image' }))
              }
              className="text-caption text-ink-subtle hover:text-danger"
            >
              Remove
            </button>
          )}

          <span className="text-caption text-ink-subtle">
            Video up to {Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB. Wide images look best.
          </span>
        </div>

        {uploadError && (
          <p role="alert" className="mt-2 text-body-sm text-danger">
            {uploadError}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="banner-kind" className="mb-1.5 block text-body-sm font-semibold text-ink">
          Type
        </label>
        <select
          id="banner-kind"
          value={values.kind}
          onChange={(e) => set('kind', e.target.value as BannerKind)}
          className="h-12 w-full rounded-input border border-line bg-card px-4 text-body text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
        >
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABEL[kind]}
            </option>
          ))}
        </select>
        {values.kind === 'courier_of_quarter' && (
          <p className="mt-1.5 text-caption text-ink-subtle">
            Leads the rotation for the first few days of each quarter, then stays in it
            without leading.
          </p>
        )}
      </div>

      <Input
        label="Headline"
        value={values.title}
        onChange={(e) => set('title', e.target.value)}
        hint="Shown large over the artwork. Keep it short."
        inputSize="lg"
      />

      <Textarea
        label="Subtitle (optional)"
        value={values.subtitle ?? ''}
        onChange={(e) => set('subtitle', e.target.value || null)}
        rows={2}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Button text (optional)"
          value={values.cta_label ?? ''}
          onChange={(e) => set('cta_label', e.target.value || null)}
          placeholder="Order now"
        />
        <Input
          label="Button link (optional)"
          value={values.cta_href ?? ''}
          onChange={(e) => set('cta_href', e.target.value || null)}
          placeholder="/restaurants"
          hint="A path like /restaurants, or a full https:// link."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          label="Priority"
          type="number"
          value={String(values.priority)}
          onChange={(e) => set('priority', Number(e.target.value) || 0)}
          hint="Higher leads."
        />
        <Input
          label="Order"
          type="number"
          value={String(values.sort_order)}
          onChange={(e) => set('sort_order', Number(e.target.value) || 0)}
          hint="Breaks ties."
        />
        <Input
          label="Ends (optional)"
          type="date"
          value={values.ends_at ? values.ends_at.slice(0, 10) : ''}
          onChange={(e) =>
            set('ends_at', e.target.value ? new Date(e.target.value).toISOString() : null)
          }
          hint="Comes down by itself."
        />
      </div>

      {/* ── Publishing is a decision, so it is a decision on the form ──
          Not a toggle buried in the list. Someone saving a campaign should say
          whether it goes on the homepage now. */}
      <label className="flex items-start gap-3 rounded-card border border-line bg-surface p-4">
        <input
          type="checkbox"
          checked={values.is_active}
          onChange={(e) => set('is_active', e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[color:rgb(var(--brand))]"
        />
        <span className="text-body-sm">
          <span className="font-semibold text-ink">Show on the homepage</span>
          <span className="mt-0.5 block text-ink-muted">
            Live immediately for every visitor. Leave off to keep it as a draft.
          </span>
        </span>
      </label>

      {error && (
        <p role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="outline" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          fullWidth
          loading={busy}
          disabled={!valid || uploading}
          onClick={() => onSave(values)}
        >
          Save campaign
        </Button>
      </div>
    </div>
  );
}
