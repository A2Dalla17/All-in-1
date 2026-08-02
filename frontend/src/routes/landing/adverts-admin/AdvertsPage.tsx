import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  LogOut,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';

import {
  KIND_LABEL,
  bannersAdminApi, MAX_VIDEO_BYTES,
  type BannerKind,
  type FeaturedBanner,
} from '@/api/banners';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Container } from '@/components/ui/Container';
import { useAuth } from '@/providers/AuthProvider';
import { formatBytes, ImageError, prepareImage, type PreparedImage } from '@/lib/image';
import { usePageMeta } from '@/lib/seo';
import { cn } from '@/lib/utils';

/**
 * Homepage advertising manager.
 *
 * The whole point of this screen: pick a photo, type a name, press publish.
 * No SQL, no URLs to paste, no deploy. Everything the carousel reads is
 * editable here.
 *
 * ── Upload happens on publish, not on selection ────────────────────────────
 * Choosing a file only decodes and previews it locally. Nothing reaches
 * storage until the form is submitted, so somebody who picks the wrong photo
 * and changes their mind has not left an orphaned file in the bucket that
 * nobody will ever clean up.
 */

const KINDS: BannerKind[] = [
  'featured_business',
  'restaurant_promotion',
  'shop_promotion',
  'driver_of_quarter',
  'seasonal_campaign',
  'announcement',
];

export function AdvertsPage() {
  usePageMeta('Advertising');

  const queryClient = useQueryClient();
  const { email, signOut } = useAuth();

  const banners = useQuery({
    queryKey: ['admin', 'banners'],
    queryFn: () => bannersAdminApi.list(),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    /* The public carousel reads a different cache key; without this the
       homepage keeps showing the old set until it goes stale. */
    void queryClient.invalidateQueries({ queryKey: ['banners'] });
  };

  return (
    <Container className="py-12">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-7">
        <div>
          <h1 className="text-h1 text-ink">Advertising</h1>
          <p className="mt-2 text-body text-ink-muted">
            What appears in the showcase on the homepage. Changes are live immediately.
          </p>
        </div>

        <div className="text-right">
          {email && <p className="text-caption text-ink-subtle">{email}</p>}
          <Button
            variant="ghost"
            size="sm"
            className="mt-1"
            leadingIcon={<LogOut size={15} />}
            onClick={() => void signOut()}
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <NewAdvertForm onSaved={invalidate} />

        <section aria-labelledby="live-heading">
          <h2 id="live-heading" className="text-h3 text-ink">
            All adverts
          </h2>

          {banners.isLoading && <p className="mt-4 text-body-sm text-ink-muted">Loading…</p>}

          {banners.isError && (
            <p className="mt-4 rounded-tile bg-danger-soft px-4 py-3 text-body-sm text-danger-ink">
              {(banners.error as Error).message}
            </p>
          )}

          {banners.data?.length === 0 && (
            <p className="mt-4 rounded-tile border border-dashed border-line-strong px-4 py-8 text-center text-body-sm text-ink-muted">
              Nothing yet. Add your first advert on the left and it appears on the homepage
              straight away.
            </p>
          )}

          <ul className="mt-4 space-y-3">
            {banners.data?.map((banner) => (
              <li key={banner.id}>
                <AdvertRow banner={banner} onChanged={invalidate} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Container>
  );
}

/* -------------------------------------------------------------------------- */
/* New advert                                                                 */
/* -------------------------------------------------------------------------- */

function NewAdvertForm({ onSaved }: { onSaved: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);

  const [image, setImage] = useState<PreparedImage | null>(null);
  const [kind, setKind] = useState<BannerKind>('featured_business');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaHref, setCtaHref] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  /* A video is held as the raw File. Unlike photos it is not re-encoded in the
     browser: transcoding video client-side is minutes of work on a phone and
     usually produces a worse file than the camera already made. The size limit
     does the job instead. */
  const [video, setVideo] = useState<{ file: File; previewUrl: string } | null>(null);

  /* Object URLs are not garbage collected. Without this, previewing twenty
     images in one session leaks twenty decoded bitmaps. */
  useEffect(() => {
    return () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
    };
  }, [image]);

  useEffect(() => {
    return () => {
      if (video) URL.revokeObjectURL(video.previewUrl);
    };
  }, [video]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);

    try {
      const prepared = await prepareImage(file);
      setImage((previous) => {
        if (previous) URL.revokeObjectURL(previous.previewUrl);
        return prepared;
      });
    } catch (caught) {
      setError(
        caught instanceof ImageError ? caught.message : 'That image could not be read.',
      );
    }
  }

  function onPickVideo(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (file.size > MAX_VIDEO_BYTES) {
      setError(
        `That video is ${(file.size / 1024 / 1024).toFixed(0)} MB and the limit is 20 MB. ` +
          'Try a shorter clip, or export it at 720p instead of 4K.',
      );
      return;
    }

    /* A photo and a video are alternatives, not a pair — the slide renders one
       or the other, so holding both would leave the choice ambiguous. */
    if (image) {
      URL.revokeObjectURL(image.previewUrl);
      setImage(null);
    }
    setVideo((previous) => {
      if (previous) URL.revokeObjectURL(previous.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }

  const save = useMutation({
    mutationFn: async () => {
      let mediaUrl: string | null = null;
      let posterUrl: string | null = null;
      let mediaType: 'image' | 'video' = 'image';

      if (video) {
        const uploaded = await bannersAdminApi.uploadVideo(video.file);
        mediaUrl = uploaded.url;
        posterUrl = uploaded.posterUrl;
        mediaType = 'video';
      } else if (image) {
        mediaUrl = await bannersAdminApi.uploadImage(image.blob, image.extension);
      }

      return bannersAdminApi.create({
        kind,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        cta_label: ctaLabel.trim() || null,
        cta_href: ctaHref.trim() || null,
        image_url: mediaUrl,
        media_type: mediaType,
        poster_url: posterUrl,
        is_active: true,
        /* The quarterly driver leads the rotation; everything else queues
           behind it in the paid band. */
        priority: kind === 'driver_of_quarter' ? 100 : 10,
        sort_order: 0,
        ends_at: null,
      });
    },
    onSuccess: () => {
      if (image) URL.revokeObjectURL(image.previewUrl);
      if (video) URL.revokeObjectURL(video.previewUrl);
      setImage(null);
      setVideo(null);
      setTitle('');
      setSubtitle('');
      setCtaLabel('');
      setCtaHref('');
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      if (fileInput.current) fileInput.current.value = '';
      onSaved();
    },
    onError: (caught) => setError((caught as Error).message),
  });

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) {
      setError('Give the advert a title.');
      return;
    }
    save.mutate();
  }

  return (
    <Card className="h-fit lg:sticky lg:top-8">
      <h2 className="text-h3 text-ink">Add an advert</h2>
      <p className="mt-1.5 text-body-sm text-ink-muted">
        Choose a photo or a short video and give it a name. It goes live as soon as
        you publish.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {/* Image picker */}
        <div>
          <span className="mb-1.5 block text-body-sm font-medium text-ink">
            Photo or video
          </span>

          <input
            ref={fileInput}
            id="advert-image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="sr-only"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />

          {image ? (
            <div className="relative overflow-hidden rounded-tile border border-line">
              <img
                src={image.previewUrl}
                alt="Preview of the advert you are about to publish"
                className="aspect-[21/9] w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remove this photo"
                onClick={() => {
                  URL.revokeObjectURL(image.previewUrl);
                  setImage(null);
                  if (fileInput.current) fileInput.current.value = '';
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75"
              >
                <X size={16} />
              </button>
              <p className="bg-surface px-3 py-2 text-micro text-ink-subtle">
                {image.width}×{image.height} · {formatBytes(image.bytes)} · resized for the web
              </p>
            </div>
          ) : (
            <label
              htmlFor="advert-image"
              className="flex aspect-[21/9] cursor-pointer flex-col items-center justify-center gap-2 rounded-tile border-2 border-dashed border-line-strong bg-surface text-ink-muted transition-colors hover:border-brand hover:text-brand-ink"
            >
              <ImagePlus size={26} aria-hidden />
              <span className="text-body-sm font-medium">Choose a photo</span>
              <span className="text-micro text-ink-subtle">JPG, PNG or WebP</span>
            </label>
          )}

          {/* Video. Offered as an alternative to the photo rather than an
              extra: a slide shows one or the other, so allowing both would
              leave it ambiguous which the visitor is meant to see. */}
          <input
            ref={videoInput}
            id="advert-video"
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="sr-only"
            onChange={(e) => onPickVideo(e.target.files?.[0])}
          />

          {video ? (
            <div className="relative mt-3 overflow-hidden rounded-tile border border-line">
              <video
                src={video.previewUrl}
                className="aspect-[21/9] w-full object-cover"
                muted
                loop
                playsInline
                autoPlay
              />
              <button
                type="button"
                aria-label="Remove this video"
                onClick={() => {
                  URL.revokeObjectURL(video.previewUrl);
                  setVideo(null);
                  if (videoInput.current) videoInput.current.value = '';
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm hover:bg-black/75"
              >
                <X size={16} />
              </button>
              <p className="bg-surface px-3 py-2 text-micro text-ink-subtle">
                {formatBytes(video.file.size)} · plays muted and on a loop, like every
                advert video on the web
              </p>
            </div>
          ) : (
            !image && (
              <label
                htmlFor="advert-video"
                className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-tile border border-dashed border-line-strong bg-surface px-4 py-3 text-body-sm text-ink-muted transition-colors hover:border-brand hover:text-brand-ink"
              >
                <Video size={18} aria-hidden />
                <span className="font-medium">or choose a video</span>
                <span className="text-micro text-ink-subtle">MP4 or WebM, up to 20 MB</span>
              </label>
            )
          )}
        </div>

        <Field label="Type">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BannerKind)}
            className="h-11 w-full rounded-control border border-line bg-bg px-3 text-body text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Title" hint="The business name, or the driver's name.">
          <Input value={title} onChange={setTitle} required placeholder="Marka Restaurant" />
        </Field>

        <Field label="Subtitle" hint="Optional. The offer, or what they are known for.">
          <Input value={subtitle} onChange={setSubtitle} placeholder="20% off every Sunday" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Button text" hint="Optional.">
            <Input value={ctaLabel} onChange={setCtaLabel} placeholder="View menu" />
          </Field>
          <Field label="Button link">
            <Input value={ctaHref} onChange={setCtaHref} placeholder="https://…" />
          </Field>
        </div>

        {error && (
          <p role="alert" className="rounded-tile bg-danger-soft px-3.5 py-2.5 text-body-sm text-danger-ink">
            {error}
          </p>
        )}

        {saved && (
          <p className="flex items-center gap-2 rounded-tile bg-accent-soft px-3.5 py-2.5 text-body-sm text-accent-ink">
            <CheckCircle2 size={16} aria-hidden />
            Published. It is on the homepage now.
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          fullWidth
          loading={save.isPending}
          leadingIcon={<Upload size={16} />}
        >
          {save.isPending ? 'Publishing…' : 'Publish to homepage'}
        </Button>
      </form>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Existing advert                                                            */
/* -------------------------------------------------------------------------- */

function AdvertRow({ banner, onChanged }: { banner: FeaturedBanner; onChanged: () => void }) {
  const [confirming, setConfirming] = useState(false);

  const toggle = useMutation({
    mutationFn: () => bannersAdminApi.setActive(banner.id, !banner.is_active),
    onSuccess: onChanged,
  });

  const remove = useMutation({
    mutationFn: () => bannersAdminApi.remove(banner),
    onSuccess: onChanged,
  });

  return (
    <article
      className={cn(
        'flex items-center gap-4 rounded-card border border-line bg-card p-3 shadow-card',
        !banner.is_active && 'opacity-60',
      )}
    >
      {banner.image_url ? (
        <img
          src={banner.image_url}
          alt=""
          loading="lazy"
          className="h-16 w-28 shrink-0 rounded-tile border border-line object-cover"
        />
      ) : (
        <div className="grid h-16 w-28 shrink-0 place-items-center rounded-tile border border-dashed border-line-strong text-ink-subtle">
          <ImagePlus size={18} aria-hidden />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-micro font-semibold uppercase tracking-wide text-brand-ink">
          {KIND_LABEL[banner.kind]}
        </p>
        <p className="truncate text-body font-medium text-ink">{banner.title}</p>
        {banner.subtitle && (
          <p className="truncate text-body-sm text-ink-muted">{banner.subtitle}</p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toggle.mutate()}
          loading={toggle.isPending}
          leadingIcon={banner.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
        >
          {banner.is_active ? 'Live' : 'Hidden'}
        </Button>

        {confirming ? (
          <>
            <Button
              variant="danger"
              size="sm"
              loading={remove.isPending}
              onClick={() => remove.mutate()}
            >
              Delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Delete ${banner.title}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 size={15} />
          </Button>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-body-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-micro text-ink-subtle">{hint}</span>}
    </label>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  required,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-control border border-line bg-bg px-3.5 text-body text-ink placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25"
    />
  );
}
