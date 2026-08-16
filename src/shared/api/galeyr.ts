/**
 * AC7 GALEYR — the delivery data layer.
 *
 * Every read and write the delivery product makes goes through this file. No
 * component builds its own Supabase query, so when a column is renamed there is
 * one place to change and the compiler finds the callers.
 *
 * ── Money ──────────────────────────────────────────────────────────────────
 * All amounts are INTEGER CENTS, everywhere, end to end — database, network,
 * component state. They are converted to a string exactly once, at the moment
 * of display, by `formatUsd` below.
 *
 * This is not fussiness. `0.1 + 0.2` is `0.30000000000000004` in JavaScript,
 * because binary floating point cannot represent a tenth. A cart holding three
 * $6.50 dishes drifts by a fraction of a cent, and a fraction of a cent that
 * rounds the wrong way is a courier arguing with a customer on a doorstep over
 * cash. Integers cannot drift.
 *
 * ── Trust ──────────────────────────────────────────────────────────────────
 * Cart totals computed here are for DISPLAY ONLY. The real total is computed by
 * `galeyr_place_order` in the database, from the menu table, and the order is
 * created with that number regardless of what this file thinks. If the two ever
 * disagree, the database is right. See the migration for why.
 */

import { supabase, unwrap } from '@shared/lib/supabase';

/**
 * Throw on error, otherwise hand back the rows as `T[]`.
 *
 * ── Why the cast goes through `unknown` ────────────────────────────────────
 * supabase-js infers the result type by parsing the select string as a type
 * literal. That only works when the argument is a single literal; the moment a
 * column list is long enough to wrap and gets built by concatenation, the parse
 * fails and the inferred type collapses to `GenericStringError[]`, which then
 * refuses to cast to the real row type.
 *
 * The alternative is one unreadable 200-character line per query. This helper
 * keeps the column lists legible and puts the unavoidable cast in exactly one
 * place, where it is explained, rather than scattered through twelve call sites
 * as unexplained `as unknown as`.
 *
 * The safety this gives up is real but small: these row types are checked
 * against the live schema by hand. The proper fix is generated database types,
 * which is a project-wide change and not this file's job.
 */
function rows<T>(result: { data: unknown; error: unknown }): T[] {
  return unwrap(result as { data: unknown[] | null; error: null }) as T[];
}

/* -------------------------------------------------------------------------- */
/* Enums — these mirror Postgres types and must stay in step                   */
/* -------------------------------------------------------------------------- */

export type District =
  | 'abdiaziz' | 'bondhere' | 'daynile' | 'dharkenley'
  | 'hamar_jajab' | 'hamar_weyne' | 'hodan' | 'howlwadag'
  | 'huriwa' | 'karan' | 'shangani' | 'shibis'
  | 'waberi' | 'wadajir' | 'warta_nabada' | 'yaqshid';

/**
 * The sixteen districts of Mogadishu, with the spelling people actually use.
 *
 * ── Why a district and a landmark, and no map ──────────────────────────────
 * Mogadishu has no postcodes and most streets have no signed names. An address
 * here is "Hodan, near the blue mosque, call when you're close" — which is why
 * the checkout form asks for a district, a landmark and a phone number, and why
 * this product ships no map at all. A pin on a map would be a worse address
 * than the sentence, and it would put every order on the Google Maps bill.
 */
export const DISTRICTS: readonly { value: District; label: string }[] = [
  { value: 'abdiaziz', label: 'Abdiaziz' },
  { value: 'bondhere', label: 'Bondhere' },
  { value: 'daynile', label: 'Daynile' },
  { value: 'dharkenley', label: 'Dharkenley' },
  { value: 'hamar_jajab', label: 'Hamar Jajab' },
  { value: 'hamar_weyne', label: 'Hamar Weyne' },
  { value: 'hodan', label: 'Hodan' },
  { value: 'howlwadag', label: 'Howlwadag' },
  { value: 'huriwa', label: 'Huriwa' },
  { value: 'karan', label: 'Karan' },
  { value: 'shangani', label: 'Shangani' },
  { value: 'shibis', label: 'Shibis' },
  { value: 'waberi', label: 'Waberi' },
  { value: 'wadajir', label: 'Wadajir' },
  { value: 'warta_nabada', label: 'Warta Nabada' },
  { value: 'yaqshid', label: 'Yaqshid' },
];

export function districtLabel(value: District | string | null | undefined): string {
  return DISTRICTS.find((d) => d.value === value)?.label ?? '—';
}

export type OrderStatus =
  | 'received' | 'restaurant_accepted' | 'preparing' | 'ready_for_pickup'
  | 'courier_assigned' | 'out_for_delivery' | 'delivered' | 'cancelled';

export type RestaurantStatus =
  | 'pending' | 'under_review' | 'approved' | 'active' | 'suspended' | 'rejected';

export type ApplicationStatus =
  | 'pending' | 'under_review' | 'approved' | 'rejected' | 'more_info_needed';

/**
 * The order's journey, in order, as a customer would describe it.
 *
 * `cancelled` is deliberately absent: it is not a stage, it is an exit, and
 * putting it at the end of a progress bar would suggest an order travels
 * through cancellation on its way to being delivered.
 */
export const ORDER_STAGES: readonly OrderStatus[] = [
  'received',
  'restaurant_accepted',
  'preparing',
  'ready_for_pickup',
  'courier_assigned',
  'out_for_delivery',
  'delivered',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, { en: string; so: string }> = {
  received:            { en: 'Order received',    so: 'Dalabka waa la helay' },
  restaurant_accepted: { en: 'Restaurant accepted', so: 'Makhaayaddu waa aqbashay' },
  preparing:           { en: 'Being prepared',    so: 'Waa la kariyaa' },
  ready_for_pickup:    { en: 'Ready for pickup',  so: 'Diyaar u ah qaadista' },
  courier_assigned:    { en: 'Courier assigned',  so: 'Wadaha waa la doortay' },
  out_for_delivery:    { en: 'On the way',        so: 'Waa socdaa' },
  delivered:           { en: 'Delivered',         so: 'Waa la gaarsiiyay' },
  cancelled:           { en: 'Cancelled',         so: 'Waa la joojiyay' },
};

/* -------------------------------------------------------------------------- */
/* Money                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Cents → "$6.50".
 *
 * USD, because that is what Mogadishu prices in. Deliberately NOT using the
 * shared `formatCurrency`, which formats in GBP for the London taxi business
 * and would quietly print a pound sign on a Somali menu.
 */
export function formatUsd(cents: number | null | undefined): string {
  if (cents === null || cents === undefined || Number.isNaN(cents)) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

/* -------------------------------------------------------------------------- */
/* Row shapes                                                                  */
/* -------------------------------------------------------------------------- */

export interface Restaurant {
  id: string;
  name: string;
  name_so: string | null;
  description: string | null;
  district: District;
  landmark: string;
  phone: string;
  image_url: string | null;
  cuisine: string[] | null;
  delivery_fee_cents: number;
  minimum_order_cents: number;
  prep_time_minutes: number;
  is_accepting_orders: boolean;
  status: RestaurantStatus;
  /**
   * Set on every seeded restaurant, and the reason it is a column rather than a
   * naming convention: the site can label a demo listing wherever it appears,
   * and nothing can reach a customer looking like a real partner. See the
   * `DemoBadge` component — every surface that renders a restaurant checks this.
   */
  is_demo: boolean;
  commission_rate?: number;
  email?: string | null;
  opening_hours?: Record<string, { open: string; close: string }> | null;

  /* Profile additions used by the public restaurant page. */
  slug?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  rating?: number | null;
  rating_count?: number;
  website_url?: string | null;
  ios_app_url?: string | null;
  android_app_url?: string | null;

  /* Operational ownership. Whoever approved the restaurant owns the
     relationship with it — see ControlMyRestaurants. */
  line_manager_id?: string | null;
  approved_by_staff_id?: string | null;
  approved_at?: string | null;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  name_so: string | null;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  name: string;
  name_so: string | null;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
}

export interface OrderItem {
  id: string;
  item_name: string;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
  notes: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  restaurant_id: string;
  courier_id: string | null;
  district: District;
  landmark: string;
  address_notes: string | null;
  status: OrderStatus;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  notes: string | null;
  cancellation_reason: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

export interface OrderWithDetail extends Order {
  galeyr_order_items?: OrderItem[];
  galeyr_restaurants?: { name: string; phone: string; district: District } | null;
  galeyr_couriers?: { full_name: string; phone: string; courier_code: string } | null;
}

export interface Courier {
  id: string;
  full_name: string;
  phone: string;
  courier_code: string;
  vehicle_type: string;
  is_approved: boolean;
  is_active: boolean;
  is_available: boolean;
  total_deliveries: number;
}

export interface RestaurantApplication {
  id: string;
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email: string | null;
  district: District;
  landmark: string;
  cuisine: string[] | null;
  branches: number;
  opening_hours: string | null;
  menu_notes: string | null;
  business_notes: string | null;
  status: ApplicationStatus;
  admin_notes: string | null;
  restaurant_id: string | null;
  created_at: string;
  reviewed_at: string | null;
}

/* -------------------------------------------------------------------------- */
/* Public reads — anything a visitor can see without signing in                */
/* -------------------------------------------------------------------------- */

/**
 * Restaurants a customer can order from.
 *
 * No `status` filter is written here, and that is intentional. The RLS policy
 * `galeyr_restaurants_public_read` already restricts anonymous reads to
 * `status = 'active'`. Repeating the condition in the query would create a
 * second place for the rule to live, and the day someone relaxes one and not
 * the other, a restaurant that has not agreed to work with AC7 GALEYR appears
 * on the site. The database is the single gate.
 */
export async function listRestaurants(): Promise<Restaurant[]> {
  return rows<Restaurant>(
    await supabase
      .from('galeyr_restaurants')
      .select(
        'id,name,name_so,description,district,landmark,phone,image_url,cuisine,' +
          'delivery_fee_cents,minimum_order_cents,prep_time_minutes,' +
          'is_accepting_orders,status,is_demo,opening_hours,slug,' +
          'logo_url,cover_image_url,rating,rating_count',
      )
      // Open kitchens first — a closed restaurant is not a useful first result.
      .order('is_accepting_orders', { ascending: false })
      .order('name'),
  );
}

/**
 * Look up a restaurant by slug, falling back to id.
 *
 * ── Why both ──────────────────────────────────────────────────────────────
 * `/restaurants/aroos-restaurant` is what a partner wants to print and what
 * shares readably over WhatsApp. But links to the uuid form already exist —
 * in the cart, in messages people have sent — and breaking them to gain a
 * prettier URL is a bad trade. A uuid is recognisable by shape, so one function
 * serves both without ambiguity.
 */
export async function getRestaurantBySlug(slugOrId: string): Promise<Restaurant | null> {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  const { data, error } = await supabase
    .from('galeyr_restaurants')
    .select(
      'id,name,name_so,description,district,landmark,phone,image_url,cuisine,' +
        'delivery_fee_cents,minimum_order_cents,prep_time_minutes,' +
        'is_accepting_orders,status,is_demo,opening_hours,slug,' +
        'logo_url,cover_image_url,rating,rating_count,website_url,' +
        'ios_app_url,android_app_url',
    )
    .eq(isUuid ? 'id' : 'slug', slugOrId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Restaurant | null) ?? null;
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('galeyr_restaurants')
    .select(
      'id,name,name_so,description,district,landmark,phone,image_url,cuisine,' +
        'delivery_fee_cents,minimum_order_cents,prep_time_minutes,' +
        'is_accepting_orders,status,is_demo,opening_hours,slug,' +
        'logo_url,cover_image_url,rating,rating_count,website_url,' +
        'ios_app_url,android_app_url',
    )
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Restaurant | null) ?? null;
}

export async function getMenu(
  restaurantId: string,
): Promise<{ categories: MenuCategory[]; items: MenuItem[] }> {
  const [categories, items] = await Promise.all([
    supabase
      .from('galeyr_menu_categories')
      .select('id,restaurant_id,name,name_so,sort_order')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
    supabase
      .from('galeyr_menu_items')
      .select(
        'id,restaurant_id,category_id,name,name_so,description,price_cents,' +
          'image_url,is_available,sort_order',
      )
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
  ]);

  return {
    categories: rows<MenuCategory>(categories),
    items: rows<MenuItem>(items),
  };
}

/* -------------------------------------------------------------------------- */
/* Placing an order                                                            */
/* -------------------------------------------------------------------------- */

export interface PlaceOrderInput {
  restaurantId: string;
  customerName: string;
  customerPhone: string;
  district: District;
  landmark: string;
  addressNotes?: string;
  notes?: string;
  items: { menu_item_id: string; quantity: number; notes?: string }[];
}

/**
 * Place an order.
 *
 * ── What is NOT sent ───────────────────────────────────────────────────────
 * No prices. Not the subtotal, not the delivery fee, not the total. The browser
 * sends item ids and quantities; the database looks the prices up and computes
 * the total itself.
 *
 * That asymmetry is the whole security model for checkout. Payment is cash on
 * delivery, so the number stored on the order is the number a courier collects
 * at a door. If the browser could state it, anyone could open the network tab
 * and buy dinner for one cent, and the loss would land on the restaurant.
 */
export async function placeOrder(
  input: PlaceOrderInput,
): Promise<{ orderNumber: string; totalCents: number }> {
  const { data, error } = await supabase.rpc('galeyr_place_order', {
    p_restaurant_id: input.restaurantId,
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_district: input.district,
    p_landmark: input.landmark,
    p_address_notes: input.addressNotes ?? null,
    p_notes: input.notes ?? null,
    p_items: input.items,
  });

  if (error) throw new Error(error.message);

  const row = (data as { order_number: string; total_cents: number }[] | null)?.[0];
  if (!row) throw new Error('The order could not be placed. Please try again.');

  return { orderNumber: row.order_number, totalCents: row.total_cents };
}

/**
 * What a customer sees when tracking an order.
 *
 * Deliberately narrower than `Order`. The tracking function is SECURITY DEFINER
 * — it runs with the privileges to read any order — so it returns a hand-picked
 * list of columns rather than the row. `customer_name`, `customer_phone` and
 * `address_notes` are absent because a person tracking an order already knows
 * them, and anything returned here is returned to whoever holds the order
 * number and a matching phone.
 */
export interface TrackedOrder {
  order_number: string;
  status: OrderStatus;
  restaurant_name: string;
  courier_name: string | null;
  courier_code: string | null;
  total_cents: number;
  currency: string;
  district: District;
  landmark: string;
  cancellation_reason: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  assigned_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
}

/**
 * Look up an order for a customer who is not signed in.
 *
 * ── Why the phone number is required ───────────────────────────────────────
 * Order numbers run `G-260809-0001`, `…-0002`. They are sequential by design —
 * a customer has to read one out over the phone. That also means anybody can
 * guess the next one, so the number alone cannot be the key to a record holding
 * someone's address and what they eat. The phone number is the second factor.
 *
 * Matching is on the last nine digits, so `0611234567`, `+252 61 123 4567` and
 * `252611234567` all find the same order. A person reading their own number
 * back should never be told it does not exist.
 */
export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('galeyr_track_order', {
    p_order_number: orderNumber.trim().toUpperCase(),
    p_phone: phone.trim(),
  });

  if (error) throw new Error(error.message);

  const rows = data as TrackedOrder[] | null;
  return rows?.[0] ?? null;
}

/* -------------------------------------------------------------------------- */
/* Applications — restaurants asking to join                                   */
/* -------------------------------------------------------------------------- */

export interface ApplicationInput {
  restaurant_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  district: District;
  landmark: string;
  cuisine: string[];
  branches: number;
  opening_hours?: string;
  menu_notes?: string;
  business_notes?: string;
}

/**
 * Submit a partnership application.
 *
 * This inserts an application, NOT a restaurant. Nothing here makes anything
 * appear on the site: an application lands at `pending` and only an
 * administrator, through `galeyr_approve_application`, can turn one into a
 * restaurant — and even then it is created `approved`, not `active`.
 *
 * A form that published a listing on submit would mean a stranger could put any
 * business's name on AC7 GALEYR without that business ever hearing of us.
 */
export async function submitApplication(input: ApplicationInput): Promise<void> {
  /* ── Do not add `.select()` here ──
     supabase-js only appends RETURNING when you chain `.select()`, and RETURNING
     additionally requires a SELECT policy for the new row. Anonymous callers
     deliberately have none — an application holds an owner's private phone
     number and business details, and RLS is row level, so any read policy at
     all would expose every column to everyone.

     Adding `.select()` to "get the new id back" would therefore break every
     public registration with an RLS violation, while working perfectly for any
     signed-in admin testing it. Verified against the live database. */
  const { error } = await supabase.from('galeyr_restaurant_applications').insert(input);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Restaurant portal — signed-in staff, scoped by RLS to their own restaurant  */
/* -------------------------------------------------------------------------- */

/**
 * The restaurants the signed-in user works for.
 *
 * No filter by user id is written here either. `galeyr_restaurants_staff_read`
 * scopes this to the caller's own memberships, so a query with no WHERE clause
 * returns exactly their restaurants and nobody else's. Writing the filter in
 * JavaScript as well would imply the security lives in the client.
 */
export async function myRestaurants(): Promise<Restaurant[]> {
  return rows<Restaurant>(
    await supabase
      .from('galeyr_restaurants')
      .select(
        'id,name,name_so,description,district,landmark,phone,image_url,cuisine,' +
          'delivery_fee_cents,minimum_order_cents,prep_time_minutes,' +
          'is_accepting_orders,status,is_demo,commission_rate,email,opening_hours',
      )
      .order('name'),
  );
}

export async function listRestaurantOrders(
  restaurantId: string,
  opts: { active?: boolean } = {},
): Promise<OrderWithDetail[]> {
  let query = supabase
    .from('galeyr_orders')
    .select('*, galeyr_order_items(*)')
    .eq('restaurant_id', restaurantId);

  query = opts.active
    ? query.not('status', 'in', '(delivered,cancelled)').order('placed_at')
    : query.order('placed_at', { ascending: false }).limit(100);

  return rows<OrderWithDetail>(await query);
}

/**
 * Move an order to its next state.
 *
 * The `in` guard on the current status is not decoration — it makes the update
 * a compare-and-set. Two tablets in the same kitchen, or one member of staff
 * double-tapping on a slow connection, would otherwise both succeed, and the
 * second would drag an order that a courier has already collected back to
 * "preparing". With the guard, the loser matches zero rows and changes nothing.
 */
export async function setOrderStatus(
  orderId: string,
  next: OrderStatus,
  expectedFrom: OrderStatus[],
): Promise<void> {
  const { error, count } = await supabase
    .from('galeyr_orders')
    .update({ status: next }, { count: 'exact' })
    .eq('id', orderId)
    .in('status', expectedFrom);

  if (error) throw new Error(error.message);
  if (count === 0) {
    throw new Error('This order has already moved on. Refresh to see where it is now.');
  }
}

export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('galeyr_orders')
    .update({ status: 'cancelled', cancellation_reason: reason })
    .eq('id', orderId)
    .not('status', 'in', '(delivered,cancelled)');

  if (error) throw new Error(error.message);
}

export async function setAcceptingOrders(
  restaurantId: string,
  accepting: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('galeyr_restaurants')
    .update({ is_accepting_orders: accepting })
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
}

export async function updateRestaurantProfile(
  restaurantId: string,
  patch: Partial<
    Pick<
      Restaurant,
      | 'name_so' | 'description' | 'phone' | 'landmark' | 'district'
      | 'prep_time_minutes' | 'delivery_fee_cents' | 'minimum_order_cents'
    >
  >,
): Promise<void> {
  const { error } = await supabase
    .from('galeyr_restaurants')
    .update(patch)
    .eq('id', restaurantId);

  if (error) throw new Error(error.message);
}

/* ---- menu management ---- */

export async function upsertMenuItem(
  item: Partial<MenuItem> & { restaurant_id: string; name: string; price_cents: number },
): Promise<void> {
  const { error } = item.id
    ? await supabase.from('galeyr_menu_items').update(item).eq('id', item.id)
    : await supabase.from('galeyr_menu_items').insert(item);

  if (error) throw new Error(error.message);
}

export async function setItemAvailability(id: string, available: boolean): Promise<void> {
  const { error } = await supabase
    .from('galeyr_menu_items')
    .update({ is_available: available })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { error } = await supabase.from('galeyr_menu_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function createCategory(
  restaurantId: string,
  name: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('galeyr_menu_categories')
    .insert({ restaurant_id: restaurantId, name, sort_order: sortOrder });

  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Control room — administrators                                               */
/* -------------------------------------------------------------------------- */

export async function listAllOrders(opts: { active?: boolean } = {}): Promise<OrderWithDetail[]> {
  let query = supabase
    .from('galeyr_orders')
    .select(
      '*, galeyr_order_items(*), galeyr_restaurants(name,phone,district), ' +
        'galeyr_couriers(full_name,phone,courier_code)',
    );

  query = opts.active
    ? query.not('status', 'in', '(delivered,cancelled)').order('placed_at')
    : query.order('placed_at', { ascending: false }).limit(200);

  return rows<OrderWithDetail>(await query);
}

export interface ControlRoomStats {
  ordersToday: number;
  active: number;
  completedToday: number;
  cancelledToday: number;
  revenueTodayCents: number;
  activeRestaurants: number;
  activeCouriers: number;
  pendingApplications: number;
}

/**
 * The numbers on the control room dashboard.
 *
 * ── Why revenue counts only delivered orders ───────────────────────────────
 * Payment is cash on delivery. An order that is cooking is not money; an order
 * that was cancelled at the door is not money. Counting anything before
 * `delivered` would report income the business does not have, and a revenue
 * figure that flatters itself is worse than no revenue figure.
 */
export async function getControlRoomStats(): Promise<ControlRoomStats> {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since = startOfToday.toISOString();

  const [today, active, restaurants, couriers, applications] = await Promise.all([
    supabase
      .from('galeyr_orders')
      .select('status,total_cents')
      .gte('placed_at', since),
    supabase
      .from('galeyr_orders')
      .select('id', { count: 'exact', head: true })
      .not('status', 'in', '(delivered,cancelled)'),
    supabase
      .from('galeyr_restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('galeyr_couriers')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', true)
      .eq('is_active', true),
    supabase
      .from('galeyr_restaurant_applications')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'under_review', 'more_info_needed']),
  ]);

  const rows = (today.data ?? []) as { status: OrderStatus; total_cents: number }[];

  return {
    ordersToday: rows.length,
    active: active.count ?? 0,
    completedToday: rows.filter((r) => r.status === 'delivered').length,
    cancelledToday: rows.filter((r) => r.status === 'cancelled').length,
    revenueTodayCents: rows
      .filter((r) => r.status === 'delivered')
      .reduce((sum, r) => sum + r.total_cents, 0),
    activeRestaurants: restaurants.count ?? 0,
    activeCouriers: couriers.count ?? 0,
    pendingApplications: applications.count ?? 0,
  };
}

export async function listCouriers(): Promise<Courier[]> {
  return rows<Courier>(
    await supabase
      .from('galeyr_couriers')
      .select('id,full_name,phone,courier_code,vehicle_type,is_approved,is_active,is_available,total_deliveries')
      .order('full_name'),
  );
}

/**
 * Assign a courier by hand.
 *
 * Manual, and staying manual for now. Automatic dispatch needs live courier
 * positions and a rule for what "nearest" means on Mogadishu's roads; guessing
 * at either would produce an assignment nobody can explain to the courier who
 * did not get the job. A person in the control room with a phone is a better
 * dispatcher than a bad algorithm, and this is the shape the algorithm will
 * eventually replace.
 */
export async function assignCourier(orderId: string, courierId: string): Promise<void> {
  const { error, count } = await supabase
    .from('galeyr_orders')
    .update({ status: 'courier_assigned', courier_id: courierId }, { count: 'exact' })
    .eq('id', orderId)
    // Assigning before the food is ready sends a courier to wait in a kitchen.
    .in('status', ['ready_for_pickup', 'courier_assigned']);

  if (error) throw new Error(error.message);
  if (count === 0) throw new Error('That order is not ready for a courier yet.');
}

export async function listRestaurantsAdmin(): Promise<Restaurant[]> {
  return rows<Restaurant>(
    await supabase
      .from('galeyr_restaurants')
      .select(
        'id,name,name_so,description,district,landmark,phone,email,cuisine,image_url,' +
          'delivery_fee_cents,minimum_order_cents,prep_time_minutes,' +
          'is_accepting_orders,status,is_demo,commission_rate,slug,' +
          'logo_url,cover_image_url,rating,rating_count,' +
          'line_manager_id,approved_by_staff_id,approved_at',
      )
      .order('status')
      .order('name'),
  );
}

export async function setRestaurantStatus(
  id: string,
  status: RestaurantStatus,
): Promise<void> {
  const { error } = await supabase
    .from('galeyr_restaurants')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(error.message);
}

export async function listApplications(): Promise<RestaurantApplication[]> {
  return rows<RestaurantApplication>(
    await supabase
      .from('galeyr_restaurant_applications')
      .select('*')
      .order('created_at', { ascending: false }),
  );
}

export async function setApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminNotes?: string,
): Promise<void> {
  const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (adminNotes !== undefined) patch['admin_notes'] = adminNotes;

  const { error } = await supabase
    .from('galeyr_restaurant_applications')
    .update(patch)
    .eq('id', id);

  if (error) throw new Error(error.message);
}

/** Approve an application, creating the restaurant. Admin-only, enforced in SQL. */
export async function approveApplication(id: string): Promise<string> {
  const { data, error } = await supabase.rpc('galeyr_approve_application', {
    p_application_id: id,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/* -------------------------------------------------------------------------- */
/* Food photography                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The bucket holding menu and restaurant photographs.
 *
 * Public for reads — a picture of a plate is not private, and making it
 * private would mean a signed URL per item on every menu render: slow,
 * uncacheable, and protecting nothing. Contrast `verification-docs`, which
 * holds passports and is correctly private.
 *
 * Writes are policed in SQL, not here. The storage policy checks that the
 * first path segment is a restaurant the caller actually belongs to, so a
 * manager cannot upload into somebody else's folder however the client is
 * manipulated.
 */
const MENU_IMAGE_BUCKET = 'menu-images';

/** Matches the bucket's own limit. Checked here too so the user gets a
 *  sentence rather than a 413 from the storage API. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Upload one food photograph and return its public URL.
 *
 * ── The path is the permission ────────────────────────────────────────────
 *     menu-images/<restaurant_id>/<random>.<ext>
 *
 * The restaurant id has to be the first segment because that is what the RLS
 * policy reads. Changing this shape without changing the policy would either
 * break every upload or, worse, stop the folder check meaning anything.
 *
 * ── Why a generated filename ──────────────────────────────────────────────
 * Never the user's own filename. A name like `../../avatar.png` is a path
 * traversal attempt, and `Suqaar.jpg` from two restaurants would collide.
 * A random name is both safe and unique, and nothing reads it back.
 */
export async function uploadMenuImage(
  restaurantId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('That file is not an image. Use a JPG, PNG or WebP photo.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(
      `That photo is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB — take it again at a smaller size.`,
    );
  }

  const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const path = `${restaurantId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(MENU_IMAGE_BUCKET)
    .upload(path, file, { cacheControl: '31536000', upsert: false });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(MENU_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Remove a photograph, given the public URL we stored.
 *
 * Deliberately never throws. A menu item whose photo has already gone, or
 * whose URL points somewhere outside our bucket, is not a reason to block the
 * person from saving their menu — the orphaned file costs a few kilobytes and
 * the failed edit costs them their evening.
 */
export async function deleteMenuImage(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  const marker = `/${MENU_IMAGE_BUCKET}/`;
  const at = publicUrl.indexOf(marker);
  if (at === -1) return;
  const path = publicUrl.slice(at + marker.length);
  if (!path) return;
  await supabase.storage.from(MENU_IMAGE_BUCKET).remove([path]);
}
