/**
 * AC7 Ride — React Query bindings
 *
 * One place for every cache key and every fetch policy. Components call these
 * hooks, never the API modules directly, so caching and invalidation stay
 * consistent across screens.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  earningsApi,
  favoritesApi,
  geoApi,
  mapsApi,
  paymentsApi,
  pricingApi,
  rideTypesApi,
  ridesApi,
  driverRidesApi,
  safetyApi,
  walletApi,
} from '@/api';
import type { LatLng, RideRequestPayload } from '@/api/types';
import type { EstimateRequest } from '@/api';

/* -------------------------------------------------------------------------- */
/* Cache keys                                                                  */
/* -------------------------------------------------------------------------- */

export const keys = {
  rideTypes: ['ride-types'] as const,
  rides: (filters?: unknown) => ['rides', filters] as const,
  ride: (id: string) => ['ride', id] as const,
  nearbyDrivers: (position: LatLng) =>
    ['nearby-drivers', position.lat.toFixed(3), position.lng.toFixed(3)] as const,
  estimates: (req: EstimateRequest) => ['estimates', req] as const,
  route: (from: LatLng, to: LatLng) => ['route', from, to] as const,
  surge: (position: LatLng) => ['surge', position.lat.toFixed(2), position.lng.toFixed(2)] as const,
  wallet: ['wallet'] as const,
  walletTransactions: ['wallet', 'transactions'] as const,
  paymentMethods: ['payment-methods'] as const,
  favorites: ['favorites'] as const,
  emergencyContacts: ['safety', 'contacts'] as const,
  driverStatus: ['driver', 'status'] as const,
  driverAvailable: ['driver', 'available-rides'] as const,
  earningsSummary: (period?: string) => ['driver', 'earnings', 'summary', period] as const,
};

/* -------------------------------------------------------------------------- */
/* Ride types & pricing                                                        */
/* -------------------------------------------------------------------------- */

/** Vehicle tiers. Rarely change, so cached for the session. */
export function useRideTypes() {
  return useQuery({
    queryKey: keys.rideTypes,
    queryFn: () => rideTypesApi.available(),
    staleTime: 15 * 60_000,
  });
}

/**
 * Fare estimates for every tier at once, so the selector can show real prices
 * rather than placeholders. Only runs when both ends of the trip are known.
 */
export function useFareEstimates(request: EstimateRequest | null) {
  return useQuery({
    queryKey: keys.estimates(request!),
    queryFn: () => pricingApi.bulkEstimate(request!),
    enabled: request !== null,
    staleTime: 60_000,
  });
}

export function useSurge(position: LatLng | null) {
  return useQuery({
    queryKey: keys.surge(position!),
    queryFn: () => pricingApi.surge(position!),
    enabled: position !== null,
    staleTime: 2 * 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Geo                                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Nearby drivers. Polls while the user is choosing a destination so the map
 * feels alive; 15 s is frequent enough to look live without hammering /geo.
 */
export function useNearbyDrivers(position: LatLng | null, enabled = true) {
  return useQuery({
    queryKey: keys.nearbyDrivers(position!),
    queryFn: () => geoApi.nearbyDrivers(position!),
    enabled: enabled && position !== null,
    refetchInterval: 15_000,
    staleTime: 10_000,
  });
}

/** Route geometry and distance from the backend maps service. */
export function useRoute(from: LatLng | null, to: LatLng | null) {
  return useQuery({
    queryKey: keys.route(from!, to!),
    queryFn: () => mapsApi.route(from!, to!),
    enabled: from !== null && to !== null,
    staleTime: 5 * 60_000,
  });
}

/* -------------------------------------------------------------------------- */
/* Rides                                                                       */
/* -------------------------------------------------------------------------- */

export function useMyRides(params?: { page?: number; per_page?: number; status?: string }) {
  return useQuery({
    queryKey: keys.rides(params),
    queryFn: () => ridesApi.list(params),
  });
}

/**
 * A single ride. Polls while the ride is live as a safety net beneath the
 * WebSocket — if the socket drops, the screen still progresses.
 */
export function useRide(rideId: string | null) {
  return useQuery({
    queryKey: keys.ride(rideId!),
    queryFn: () => ridesApi.get(rideId!),
    enabled: rideId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 10_000;
      return status === 'completed' || status === 'cancelled' ? false : 10_000;
    },
  });
}

export function useRequestRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RideRequestPayload) => ridesApi.request(payload),
    onSuccess: (ride) => {
      queryClient.setQueryData(keys.ride(ride.id), ride);
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

export function useCancelRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rideId, reason }: { rideId: string; reason?: string }) =>
      ridesApi.cancel(rideId, reason),
    onSuccess: (ride) => {
      queryClient.setQueryData(keys.ride(ride.id), ride);
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

export function useRateRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rideId,
      rating,
      feedback,
    }: {
      rideId: string;
      rating: number;
      feedback?: string;
    }) => ridesApi.rate(rideId, { rating, feedback }),
    onSuccess: (ride) => {
      queryClient.setQueryData(keys.ride(ride.id), ride);
      void queryClient.invalidateQueries({ queryKey: ['rides'] });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Wallet & payments                                                           */
/* -------------------------------------------------------------------------- */

export function useWallet() {
  return useQuery({ queryKey: keys.wallet, queryFn: () => walletApi.get() });
}

export function useWalletTransactions() {
  return useQuery({
    queryKey: keys.walletTransactions,
    queryFn: () => walletApi.transactions(),
  });
}

export function usePaymentMethods() {
  return useQuery({ queryKey: keys.paymentMethods, queryFn: () => paymentsApi.methods() });
}

export function useTopUpWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ amount, methodId }: { amount: number; methodId?: string }) =>
      walletApi.topUp(amount, methodId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: keys.wallet });
      void queryClient.invalidateQueries({ queryKey: keys.walletTransactions });
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Favorites                                                                   */
/* -------------------------------------------------------------------------- */

export function useFavorites() {
  return useQuery({ queryKey: keys.favorites, queryFn: () => favoritesApi.list() });
}

/* -------------------------------------------------------------------------- */
/* Safety                                                                      */
/* -------------------------------------------------------------------------- */

export function useEmergencyContacts() {
  return useQuery({
    queryKey: keys.emergencyContacts,
    queryFn: () => safetyApi.contacts(),
  });
}

export function useTriggerSos() {
  return useMutation({
    mutationFn: ({ position, rideId }: { position: LatLng; rideId?: string }) =>
      safetyApi.triggerSos(position, rideId),
  });
}

/* -------------------------------------------------------------------------- */
/* Driver                                                                      */
/* -------------------------------------------------------------------------- */

export function useDriverStatus() {
  return useQuery({ queryKey: keys.driverStatus, queryFn: () => geoApi.driverStatus() });
}

export function useSetDriverStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isAvailable: boolean) => geoApi.setDriverStatus(isAvailable),
    onSuccess: (driver) => {
      queryClient.setQueryData(keys.driverStatus, driver);
      void queryClient.invalidateQueries({ queryKey: keys.driverAvailable });
    },
  });
}

/** Ride requests waiting for a driver. Polled while online. */
export function useAvailableRides(enabled: boolean) {
  return useQuery({
    queryKey: keys.driverAvailable,
    queryFn: () => driverRidesApi.available(),
    enabled,
    refetchInterval: enabled ? 8_000 : false,
  });
}

export function useDriverEarnings(period: 'day' | 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: keys.earningsSummary(period),
    queryFn: () => earningsApi.summary(period),
  });
}
