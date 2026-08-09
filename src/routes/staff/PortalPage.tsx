/**
 * The restaurant portal.
 *
 * ── Who uses this, and where ───────────────────────────────────────────────
 * A member of kitchen staff, on a phone or a cheap tablet, with flour on their
 * hands and an order to get out. Not an office user with a mouse.
 *
 * That shapes everything here: the live orders board is the landing tab, every
 * action is a single large button, the next action is always the most prominent
 * thing on the card, and the board refreshes itself so nobody has to remember
 * to pull down. Anything that takes two taps to find will be missed during a
 * lunch rush, and a missed order is a customer who does not come back.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChefHat, ClipboardList, LogOut, Power, Settings2, Store, Utensils,
} from 'lucide-react';

import { DemoBadge } from '@/components/delivery/DemoNotice';
import { Button } from '@shared/components/ui/Button';
import { Container } from '@shared/components/ui/Container';
import { Spinner } from '@shared/components/ui/Spinner';
import { useAuth } from '@shared/providers/AuthProvider';
import { myRestaurants, setAcceptingOrders, type Restaurant } from '@shared/api/galeyr';
import { cn } from '@shared/lib/utils';

import { PortalOrders } from './PortalOrders';
import { PortalMenu } from './PortalMenu';
import { PortalSettings } from './PortalSettings';

type Tab = 'orders' | 'menu' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof ClipboardList }[] = [
  { id: 'orders', label: 'Orders', icon: ClipboardList },
  { id: 'menu', label: 'Menu', icon: Utensils },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function PortalPage() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('orders');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: restaurants = [], isPending } = useQuery({
    queryKey: ['galeyr', 'my-restaurants'],
    queryFn: myRestaurants,
  });

  const acceptingMutation = useMutation({
    mutationFn: ({ id, accepting }: { id: string; accepting: boolean }) =>
      setAcceptingOrders(id, accepting),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['galeyr', 'my-restaurants'] }),
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" label="Loading" />
      </div>
    );
  }

  /* A person can work for more than one branch. With one, there is nothing to
     choose, so no picker is shown. */
  const restaurant: Restaurant | undefined =
    restaurants.find((r) => r.id === selectedId) ?? restaurants[0];

  if (!restaurant) return null;

  return (
    <Container className="py-6 sm:py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Store size={20} aria-hidden className="text-brand-ink" />
            <h1 className="text-h3 font-extrabold tracking-tight text-ink">
              {restaurant.name}
            </h1>
            {restaurant.is_demo && <DemoBadge />}
          </div>

          {restaurants.length > 1 && (
            <select
              value={restaurant.id}
              onChange={(e) => setSelectedId(e.target.value)}
              aria-label="Choose restaurant"
              className="mt-3 h-10 rounded-input border border-line bg-card px-3 text-body-sm text-ink"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* ── The single most important control on this page ──
              A kitchen that has run out, or is closing early, needs to stop
              orders arriving in one tap. Without this the alternative is
              rejecting orders one at a time while customers keep placing them,
              which is worse for everyone. */}
          <Button
            variant={restaurant.is_accepting_orders ? 'outline' : 'primary'}
            leadingIcon={<Power size={16} />}
            loading={acceptingMutation.isPending}
            onClick={() =>
              acceptingMutation.mutate({
                id: restaurant.id,
                accepting: !restaurant.is_accepting_orders,
              })
            }
          >
            {restaurant.is_accepting_orders ? 'Stop taking orders' : 'Start taking orders'}
          </Button>

          <button
            type="button"
            onClick={() => void logout()}
            aria-label="Sign out"
            className="grid h-11 w-11 place-items-center rounded-control text-ink-muted hover:bg-surface hover:text-ink"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      </header>

      {!restaurant.is_accepting_orders && (
        <p className="mt-4 flex items-center gap-2 rounded-card border border-warning/35 bg-warning-soft px-4 py-3 text-body-sm text-warning-ink">
          <ChefHat size={16} aria-hidden />
          You are not taking new orders. Customers can see your menu but cannot order.
        </p>
      )}

      <nav className="mt-6 flex gap-1 border-b border-line" aria-label="Portal sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-3 text-body-sm font-semibold transition-colors',
              tab === item.id
                ? 'border-brand text-brand-ink'
                : 'border-transparent text-ink-muted hover:text-ink',
            )}
          >
            <item.icon size={16} aria-hidden />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'orders' && <PortalOrders restaurant={restaurant} />}
        {tab === 'menu' && <PortalMenu restaurant={restaurant} />}
        {tab === 'settings' && <PortalSettings restaurant={restaurant} />}
      </div>
    </Container>
  );
}
