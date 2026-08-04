import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Pause,
  Play,
  Store,
} from 'lucide-react';

import { bannersApi, KIND_LABEL, type BannerKind, type FeaturedBanner } from '@/api/banners';
import { Button } from '@/components/ui/Button';
import { env } from '@/config/env';
import { cn } from '@/lib/utils';

/**
 * Community Advertising Showcase — an image-led billboard.
 *
 * Sits between the tagline and the hero buttons, so it is the first thing
 * below the company name. This is advertising inventory: businesses pay for
 * this placement, and the best drivers are featured here too.
 *
 * ── Built for pictures, not paragraphs ─────────────────────────────────────
 * A restaurant advert is a photograph of the food. A shop advert is the shop
 * front. A driver spotlight is a face. So the image is the slide — full bleed,
 * fixed aspect ratio — and the words sit on top of it rather than beside it.
 * The previous version put a small thumbnail next to a block of text, which
 * reads as a news item and is not what anybody is buying.
 *
 * ── Text on photographs needs a scrim, always ──────────────────────────────
 * White text over an unknown image is a contrast bet you lose the first time
 * somebody uploads a photo of a snowy pavement. The gradient below is opaque
 * enough at the bottom that the text sits on near-black regardless of what is
 * behind it, so contrast does not depend on the advertiser's photography.
 *
 * ── Autoplay has rules ─────────────────────────────────────────────────────
 * WCAG 2.2.2: anything auto-updating for more than five seconds must be
 * pausable. Visible pause control, stops on hover and keyboard focus, and
 * never starts under prefers-reduced-motion.
 */

const ROTATE_MS = 6500;

export function CommunityShowcase({ className }: { className?: string }) {
  const banners = useQuery({
    queryKey: ['banners', 'showcase'],
    queryFn: () => bannersApi.showcase(),
    staleTime: 5 * 60_000,
    retry: 1,
  });

  /* Loading and failure both fall through to the placeholder frame. An empty
     advertising rail is never worth an error message on a company homepage. */
  const slides = useMemo<Slide[]>(() => {
    const live = banners.data ?? [];
    return live.length > 0 ? live.map(toSlide) : [PLACEHOLDER];
  }, [banners.data]);

  return (
    <section aria-labelledby="showcase-heading" className={cn('mx-auto max-w-4xl', className)}>
      <h2 id="showcase-heading" className="sr-only">
        Featured businesses and drivers
      </h2>
      <Carousel slides={slides} />
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide model                                                                */
/* -------------------------------------------------------------------------- */

interface Slide {
  id: string;
  kind: BannerKind | 'placeholder';
  label: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  mediaType: 'image' | 'video';
  poster: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
}

function toSlide(banner: FeaturedBanner): Slide {
  return {
    id: banner.id,
    kind: banner.kind,
    label: KIND_LABEL[banner.kind] ?? 'Featured',
    title: banner.title,
    subtitle: banner.subtitle,
    image: banner.image_url,
    mediaType: banner.media_type ?? 'image',
    poster: banner.poster_url,
    ctaLabel: banner.cta_label,
    ctaHref: banner.cta_href,
  };
}

/**
 * Shown until the first advert is uploaded.
 *
 * Not filler: selling this space is a real AC7 product, so an invitation to
 * buy it is honest content. It also shows the exact frame an advertiser's
 * image will occupy, which is more useful than a blank gap.
 */
const PLACEHOLDER: Slide = {
  id: 'placeholder',
  kind: 'placeholder',
  label: 'Community advertising',
  title: 'Your business could be here',
  subtitle: 'Featured placement on the AC7 homepage',
  image: null,
  mediaType: 'image',
  poster: null,
  ctaLabel: 'Advertise with AC7',
  ctaHref: `tel:${env.controlCentre.tel}`,
};

/* -------------------------------------------------------------------------- */
/* Carousel                                                                   */
/* -------------------------------------------------------------------------- */

function Carousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const regionId = useId();

  /* Read once on mount: somebody who has asked their OS for less motion is not
     going to change their mind mid-visit, and a live listener buys nothing. */
  const reduceMotion = useRef(
    typeof window !== 'undefined' &&
      (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.classList.contains('reduce-motion')),
  ).current;

  const single = slides.length <= 1;
  const autoplay = !single && !paused && !reduceMotion;

  const go = useCallback(
    (next: number) => setIndex(((next % slides.length) + slides.length) % slides.length),
    [slides.length],
  );

  /* Guard against a shrinking list leaving the index past the end — an advert
     expires between refetches and the carousel would render nothing. */
  useEffect(() => {
    if (index > slides.length - 1) setIndex(0);
  }, [slides.length, index]);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [autoplay, slides.length]);

  const slide = slides[index];
  if (!slide) return null;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label="Featured businesses and drivers"
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          setInteracted(true);
          go(index + 1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          setInteracted(true);
          go(index - 1);
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setPaused(false);
      }}
      className="relative"
    >
      <div
        id={regionId}
        /* Announce only once rotation has stopped, or the reader is talked over
           every six seconds by a change the user cannot see anyway. */
        aria-live={paused || reduceMotion ? 'polite' : 'off'}
        aria-atomic="true"
      >
        <SlideCard
          slide={slide}
          position={index + 1}
          total={slides.length}
          animate={!reduceMotion && interacted}
          playing={autoplay}
        />
      </div>

      {!single && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <IconButton
            label="Previous"
            onClick={() => {
              setInteracted(true);
              go(index - 1);
            }}
          >
            <ChevronLeft size={17} />
          </IconButton>

          <div className="flex items-center gap-2" role="tablist" aria-label="Choose a slide">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-controls={regionId}
                aria-label={`${s.label}: ${s.title}`}
                onClick={() => {
                  setInteracted(true);
                  go(i);
                }}
                className={cn(
                  'h-2 rounded-pill transition-all duration-300 ease-smooth',
                  i === index ? 'w-7 bg-brand' : 'w-2 bg-line-strong hover:bg-ink-subtle',
                )}
              />
            ))}
          </div>

          <IconButton
            label="Next"
            onClick={() => {
              setInteracted(true);
              go(index + 1);
            }}
          >
            <ChevronRight size={17} />
          </IconButton>

          {!reduceMotion && (
            <IconButton
              label={paused ? 'Resume rotation' : 'Pause rotation'}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? <Play size={15} /> : <Pause size={15} />}
            </IconButton>
          )}
        </div>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-control border border-line bg-card text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Slide                                                                      */
/* -------------------------------------------------------------------------- */

function SlideCard({
  slide,
  position,
  total,
  animate,
  playing,
}: {
  slide: Slide;
  position: number;
  total: number;
  animate: boolean;
  /** False when the carousel is paused or the visitor asked for reduced
      motion. A video must obey the same control as the rotation — a Pause
      button that stops the slides but leaves a video looping underneath is
      not a pause button. */
  playing: boolean;
}) {
  const isDriver = slide.kind === 'driver_of_quarter';
  const isPlaceholder = slide.kind === 'placeholder';
  const hasImage = Boolean(slide.image);
  const isVideo = slide.mediaType === 'video';

  return (
    <article
      /* Keyed on id so React swaps the node and the entrance animation re-runs;
         without a key it would only ever play once. */
      key={slide.id}
      aria-roledescription="slide"
      aria-label={`${position} of ${total}: ${slide.label}`}
      className={cn(
        'relative overflow-hidden rounded-panel border border-line shadow-card',
        /* Wide and shallow on desktop so the hero buttons stay above the fold;
           taller on mobile because a 21:9 strip on a phone is a letterbox. */
        'aspect-[4/3] sm:aspect-[21/9]',
        !hasImage && 'bg-surface',
        animate && 'animate-fade-in',
      )}
    >
      {hasImage && isVideo ? (
        <SlideVideo src={slide.image as string} poster={slide.poster} playing={playing} />
      ) : hasImage ? (
        <img
          src={slide.image as string}
          /* Decorative: the advertiser's name is the heading directly over it,
             so alt text would have a screen reader say it twice. */
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        /* No artwork yet. A dashed frame reads as "an image goes here" rather
           than as a broken card. */
        <div className="absolute inset-0 grid place-items-center">
          <div className="m-4 grid h-[calc(100%-2rem)] w-[calc(100%-2rem)] place-items-center rounded-tile border-2 border-dashed border-line-strong">
            <span aria-hidden className="text-ink-subtle">
              {isDriver ? <Award size={30} /> : isPlaceholder ? <ImageIcon size={30} /> : <Store size={30} />}
            </span>
          </div>
        </div>
      )}

      {/* Scrim. Only over an image — on the empty frame it would darken white. */}
      {hasImage && (
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(to top, rgb(10 10 10 / 0.88) 0%, rgb(10 10 10 / 0.55) 34%, rgb(10 10 10 / 0.10) 62%, transparent 100%)',
          }}
        />
      )}

      <div className="absolute inset-x-0 bottom-0 p-5 text-left sm:p-7">
        <p
          className={cn(
            'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-micro font-semibold uppercase tracking-[0.1em]',
            hasImage ? 'bg-white/15 text-white backdrop-blur-sm' : 'bg-brand-soft text-brand-ink',
          )}
        >
          {isDriver && <Award size={11} aria-hidden />}
          {slide.label}
        </p>

        <h3
          className={cn(
            'mt-2 text-h2',
            hasImage ? 'text-white drop-shadow-sm' : 'text-ink',
          )}
        >
          {slide.title}
        </h3>

        {slide.subtitle && (
          <p
            className={cn(
              'mt-1 text-body font-medium',
              hasImage ? 'text-white/85' : 'text-brand-ink',
            )}
          >
            {slide.subtitle}
          </p>
        )}

        {slide.ctaLabel && slide.ctaHref && (
          <a href={slide.ctaHref} className="mt-4 inline-block">
            <Button
              variant={hasImage ? 'secondary' : 'primary'}
              size="sm"
              trailingIcon={<ArrowRight size={15} />}
            >
              {slide.ctaLabel}
            </Button>
          </a>
        )}
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * An advert video inside the showcase.
 *
 * ── Why it is muted, and why that is not a compromise ──────────────────────
 * Every browser blocks autoplay with sound, so an unmuted autoplaying advert
 * simply does not start — the advertiser gets a still frame and never knows
 * why. Muted is the only setting under which the video actually plays. It is
 * also the right one: sound firing unbidden on a landing page is hostile to
 * someone browsing on a bus.
 *
 * ── Why it follows the carousel's play state ───────────────────────────────
 * WCAG 2.2.2 requires anything that moves for more than five seconds to be
 * pausable. The carousel already has a Pause button and honours
 * prefers-reduced-motion; a video that ignored both would reintroduce exactly
 * the problem that control exists to solve. So `playing` drives play/pause
 * directly, and under reduced motion the video never starts — the poster
 * stands in for it.
 *
 * ── preload="none" ─────────────────────────────────────────────────────────
 * Adverts sit below the fold on a phone. Without this the browser begins
 * fetching every advert video the moment the page loads, on someone's mobile
 * data, before they have scrolled far enough to see one. The poster is a
 * single small JPEG and carries the visual until playback is wanted.
 */
function SlideVideo({
  src,
  poster,
  playing,
}: {
  src: string;
  poster: string | null;
  playing: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (playing) {
      /* play() rejects if the browser declines — an old autoplay policy, low
         power mode, a codec it cannot handle. That rejection is not an error
         worth surfacing: the poster remains, which is a perfectly good advert. */
      void el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [playing]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      muted
      loop
      playsInline
      preload="none"
      /* Decorative in the same way the photo is: the advertiser's name is the
         heading rendered directly over this. */
      aria-hidden
      tabIndex={-1}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
