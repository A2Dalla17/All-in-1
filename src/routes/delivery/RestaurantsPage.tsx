/**
 * Browse restaurants.
 *
 * The page a customer lands on from the hero, and the one the whole business
 * rests on. It has to be readable on a cheap phone over a slow connection, so
 * there are no images, no map and no fonts beyond the ones already loaded.
 */

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bike, Clock, MapPin, Search } from 'lucide-react';

import { DemoBadge, DemoNotice } from '@/components/delivery/DemoNotice';
import { Container } from '@shared/components/ui/Container';
import { EmptyState, ErrorState } from '@shared/components/ui/EmptyState';
import { Input } from '@shared/components/ui/Input';
import { Spinner } from '@shared/components/ui/Spinner';
import {
  DISTRICTS,
  districtLabel,
  formatUsd,
  listRestaurants,
  type Restaurant,
} from '@shared/api/galeyr';
import { cn } from '@shared/lib/utils';

export function RestaurantsPage() {
  const [search, setSearch] = useState('');
  const [district, setDistrict] = useState<string>('all');

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ['galeyr', 'restaurants'],
    queryFn: listRestaurants,
  });

  /**
   * Filtering happens in the browser, not the database.
   *
   * With a handful of restaurants that is simply faster — no round trip on a
   * connection where a round trip is the expensive part. It stops being right
   * somewhere in the low hundreds, at which point this becomes a server-side
   * query with the same signature.
   */
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return (data ?? []).filter((r) => {
      if (district !== 'all' && r.district !== district) return false;
      if (!term) return true;

      return (
        r.name.toLowerCase().includes(term) ||
        (r.name_so ?? '').toLowerCase().includes(term) ||
        (r.cuisine ?? []).some((c) => c.toLowerCase().includes(term))
      );
    });
  }, [data, search, district]);

  /** Only offer districts that actually have a restaurant in them. */
  const availableDistricts = useMemo(() => {
    const present = new Set((data ?? []).map((r) => r.district));
    return DISTRICTS.filter((d) => present.has(d.value));
  }, [data]);

  return (
    <Container className="py-8 sm:py-12">
      <header className="max-w-2xl">
        <h1 className="text-h2 font-extrabold tracking-tight text-ink">
          Makhaayadaha Muqdisho
        </h1>
        <p className="mt-2 text-body text-ink-muted">
          Choose a restaurant, order in a few taps, and pay the courier in cash when it
          arrives.
        </p>
      </header>

      <DemoNotice className="mt-6" />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search restaurants or food"
          leadingIcon={<Search size={18} />}
          inputSize="lg"
          className="sm:max-w-sm"
          aria-label="Search restaurants"
        />

        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          aria-label="Filter by district"
          className={cn(
            'h-12 rounded-input border border-line bg-card px-4 text-body text-ink',
            'focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25',
          )}
        >
          <option value="all">All districts</option>
          {availableDistricts.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {isPending && (
        <div className="flex justify-center py-20">
          <Spinner size="lg" label="Loading restaurants" />
        </div>
      )}

      {isError && (
        <ErrorState
          className="py-16"
          title="We could not load the restaurants"
          description="Check your connection and try again."
          onRetry={() => void refetch()}
        />
      )}

      {!isPending && !isError && filtered.length === 0 && (
        <EmptyState
          className="py-16"
          title="Nothing here yet"
          description={
            data && data.length > 0
              ? 'No restaurant matches that. Try a different search or district.'
              : 'No restaurants are available right now. Please check back soon.'
          }
        />
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((restaurant) => (
          <RestaurantCard key={restaurant.id} restaurant={restaurant} />
        ))}
      </div>
    </Container>
  );
}

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const closed = !restaurant.is_accepting_orders;

  return (
    <Link
      to={`/restaurants/${restaurant.id}`}
      className={cn(
        'pressable group flex flex-col rounded-card border border-line bg-card p-5',
        'transition-colors hover:border-line-strong',
        closed && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-h5 font-bold text-ink">{restaurant.name}</h2>
            {restaurant.is_demo && <DemoBadge />}
          </div>

          {restaurant.cuisine && restaurant.cuisine.length > 0 && (
            <p className="mt-1 text-body-sm text-ink-muted">
              {restaurant.cuisine.join(' · ')}
            </p>
          )}
        </div>

        {/* Closed is stated on the card rather than discovered at checkout —
            finding out after choosing three dishes is the annoying version. */}
        {closed && (
          <span className="shrink-0 rounded-pill bg-surface px-2.5 py-1 text-caption font-semibold text-ink-subtle">
            Closed
          </span>
        )}
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-body-sm text-ink-muted">
        <div className="flex items-center gap-1.5">
          <MapPin size={15} aria-hidden />
          <dd>{districtLabel(restaurant.district)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={15} aria-hidden />
          <dd>{restaurant.prep_time_minutes} min</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <Bike size={15} aria-hidden />
          <dd>{formatUsd(restaurant.delivery_fee_cents)} delivery</dd>
        </div>
      </dl>

      {restaurant.minimum_order_cents > 0 && (
        <p className="mt-3 text-caption text-ink-subtle">
          Minimum order {formatUsd(restaurant.minimum_order_cents)}
        </p>
      )}
    </Link>
  );
}
