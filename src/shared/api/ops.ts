/**
 * GALEYR — Control Centre operations.
 *
 * Staff, staff codes, the audit trail, line managers, incidents and the
 * 24-hour request queue. Kept apart from `galeyr.ts`, which is the customer and
 * restaurant surface — these two are read by different people with different
 * permissions, and merging them would put the admin roster one import away from
 * a checkout page.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * The staff-code protocol, and why it is two calls
 * ══════════════════════════════════════════════════════════════════════════
 * `verifyStaffCode` → `{ ok, token }`, then the action takes the token.
 *
 * It looks like an extra round trip that a single call could avoid. It cannot.
 * If the action verified the code itself, a wrong code would raise, and in
 * Postgres a raise rolls back everything the function did — including the
 * failed-attempt counter. The lockout would silently never engage, and four
 * digits with no limiter is a few seconds of scripting.
 *
 * Splitting them means the failure is committed by the first call and the
 * rollback of the second costs nothing. The token is single use and expires in
 * two minutes.
 */

import { supabase, unwrap } from '@shared/lib/supabase';

function rows<T>(result: { data: unknown; error: unknown }): T[] {
  return unwrap(result as { data: unknown[] | null; error: null }) as T[];
}

/* -------------------------------------------------------------------------- */
/* Staff                                                                       */
/* -------------------------------------------------------------------------- */

export type StaffRole = 'operator' | 'line_manager' | 'supervisor' | 'admin';

export const STAFF_ROLE_LABEL: Record<StaffRole, string> = {
  operator: 'Operator',
  line_manager: 'Line manager',
  supervisor: 'Supervisor',
  admin: 'Platform admin',
};

export interface Staff {
  id: string;
  user_id: string | null;
  staff_ref: string;
  display_name: string;
  role: StaffRole;
  is_active: boolean;
  phone: string | null;
  /* There is deliberately no `code` or `code_hash` field. The hashes live in
     `galeyr_staff_secrets`, which has row level security enabled and no
     policies at all — nothing outside a SECURITY DEFINER function can read a
     single row, including a platform admin. That is what makes "never
     displayed in staff lists" a guarantee rather than a habit. */
}

/** The roster. Names and roles — never codes. */
export async function listStaff(): Promise<Staff[]> {
  return rows<Staff>(
    await supabase
      .from('galeyr_staff')
      .select('id,user_id,staff_ref,display_name,role,is_active,phone')
      .order('staff_ref'),
  );
}

/** The signed-in user's own staff record, or null if they are not staff. */
export async function currentStaff(): Promise<Staff | null> {
  const { data, error } = await supabase.rpc('galeyr_current_staff');
  if (error) throw new Error(error.message);

  const record = data as Staff | Staff[] | null;
  if (!record) return null;

  const staff = Array.isArray(record) ? record[0] : record;
  return staff?.id ? staff : null;
}

export interface VerifyResult {
  ok: boolean;
  reason: 'ok' | 'wrong_code' | 'locked' | 'no_code_set' | 'not_staff';
  token: string | null;
  staff_ref: string | null;
  display_name: string | null;
  role: StaffRole | null;
  attempts_remaining: number;
  locked_until: string | null;
}

/**
 * Check the signed-in staff member's own code.
 *
 * Never throws for a wrong code — a wrong code is an ordinary outcome that has
 * to be counted, and throwing would roll the count back. It throws only if the
 * request itself fails.
 */
export async function verifyStaffCode(code: string): Promise<VerifyResult> {
  const { data, error } = await supabase.rpc('galeyr_verify_staff_code', {
    p_code: code,
  });

  if (error) throw new Error(error.message);

  const result = (data as VerifyResult[] | null)?.[0];
  if (!result) throw new Error('Could not check your staff code. Try again.');
  return result;
}

/** Set or change a code. Platform admin only — enforced in SQL, not here. */
export async function setStaffCode(staffId: string, code: string): Promise<void> {
  const { error } = await supabase.rpc('galeyr_set_staff_code', {
    p_staff_id: staffId,
    p_code: code,
  });
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Confirmed actions                                                           */
/* -------------------------------------------------------------------------- */

/** Approve an application. Creates the restaurant and makes the approver its line manager. */
export async function approveApplicationAsStaff(
  applicationId: string,
  token: string,
): Promise<{ restaurantId: string; approvedBy: string }> {
  const { data, error } = await supabase.rpc('galeyr_approve_application_as_staff', {
    p_application_id: applicationId,
    p_token: token,
  });

  if (error) throw new Error(error.message);

  const row = (data as { restaurant_id: string; approved_by: string }[] | null)?.[0];
  if (!row) throw new Error('The approval did not complete.');
  return { restaurantId: row.restaurant_id, approvedBy: row.approved_by };
}

/** Change a restaurant's status, attributed and audited. */
export async function setRestaurantStatusAsStaff(
  restaurantId: string,
  status: string,
  token: string,
  notes?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('galeyr_set_restaurant_status_as_staff', {
    p_restaurant_id: restaurantId,
    p_status: status,
    p_token: token,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/* -------------------------------------------------------------------------- */
/* Audit trail                                                                 */
/* -------------------------------------------------------------------------- */

export interface AuditEntry {
  id: number;
  staff_ref: string;
  staff_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  entity_label: string | null;
  previous_status: string | null;
  new_status: string | null;
  notes: string | null;
  created_at: string;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  approve_application: 'Approved application',
  set_restaurant_status: 'Changed restaurant status',
  staff_code_failed: 'Failed staff code attempt',
  assign_courier: 'Assigned courier',
  resolve_incident: 'Resolved incident',
};

export async function listAudit(limit = 200): Promise<AuditEntry[]> {
  return rows<AuditEntry>(
    await supabase
      .from('galeyr_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit),
  );
}

/* -------------------------------------------------------------------------- */
/* Incidents                                                                   */
/* -------------------------------------------------------------------------- */

export type IncidentType =
  | 'delivery_delay' | 'courier_cancellation' | 'restaurant_cancellation'
  | 'missing_item' | 'wrong_item' | 'preparation_delay' | 'customer_complaint'
  | 'courier_complaint' | 'payment_issue' | 'technical_issue' | 'other';

export type IncidentStatus =
  | 'open' | 'investigating' | 'action_required' | 'resolved' | 'closed';

export type Priority = 'low' | 'normal' | 'high' | 'urgent';

export const INCIDENT_TYPE_LABEL: Record<IncidentType, string> = {
  delivery_delay: 'Delivery delay',
  courier_cancellation: 'Courier cancellation',
  restaurant_cancellation: 'Restaurant cancellation',
  missing_item: 'Missing item',
  wrong_item: 'Wrong item',
  preparation_delay: 'Preparation delay',
  customer_complaint: 'Customer complaint',
  courier_complaint: 'Courier complaint',
  payment_issue: 'Payment issue',
  technical_issue: 'Technical issue',
  other: 'Other',
};

export const INCIDENT_STATUS_LABEL: Record<IncidentStatus, string> = {
  open: 'Open',
  investigating: 'Investigating',
  action_required: 'Action required',
  resolved: 'Resolved',
  closed: 'Closed',
};

/** The lifecycle, in order. Used to render progress and to offer the next step. */
export const INCIDENT_FLOW: IncidentStatus[] = [
  'open', 'investigating', 'action_required', 'resolved', 'closed',
];

export interface Incident {
  id: string;
  reference: string;
  type: IncidentType;
  status: IncidentStatus;
  priority: Priority;
  restaurant_id: string | null;
  order_id: string | null;
  courier_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  assigned_staff_id: string | null;
  summary: string;
  detail: string | null;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
  galeyr_restaurants?: { name: string; slug: string | null } | null;
}

export async function listIncidents(opts: {
  assignedTo?: string;
  openOnly?: boolean;
} = {}): Promise<Incident[]> {
  let query = supabase
    .from('galeyr_incidents')
    .select('*, galeyr_restaurants(name,slug)');

  if (opts.assignedTo) query = query.eq('assigned_staff_id', opts.assignedTo);
  if (opts.openOnly) query = query.not('status', 'in', '(resolved,closed)');

  return rows<Incident>(
    await query.order('priority', { ascending: false }).order('created_at', { ascending: false }),
  );
}

export interface NewIncident {
  type: IncidentType;
  priority: Priority;
  summary: string;
  detail?: string;
  restaurant_id?: string | null;
  order_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
}

/**
 * Raise an incident.
 *
 * `assigned_staff_id` is not sent. A database trigger fills it from the
 * restaurant's line manager, so an incident cannot be created unassigned by a
 * client that forgets — and the routing rule lives in one place rather than in
 * every screen that can raise one.
 */
export async function createIncident(input: NewIncident): Promise<void> {
  const { error } = await supabase.from('galeyr_incidents').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateIncident(
  id: string,
  patch: Partial<Pick<Incident, 'status' | 'priority' | 'assigned_staff_id' | 'resolution' | 'detail'>>,
): Promise<void> {
  const { error } = await supabase.from('galeyr_incidents').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* The 24-hour request queue                                                   */
/* -------------------------------------------------------------------------- */

export type RequestChannel = 'phone' | 'whatsapp' | 'website' | 'walk_in' | 'internal' | 'email';
export type RequestKind =
  | 'customer_support' | 'restaurant_request' | 'courier_request'
  | 'it_request' | 'complaint' | 'general';
export type RequestStatus = 'new' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export const REQUEST_KIND_LABEL: Record<RequestKind, string> = {
  customer_support: 'Customer support',
  restaurant_request: 'Restaurant request',
  courier_request: 'Courier request',
  it_request: 'IT request',
  complaint: 'Complaint',
  general: 'General',
};

export const REQUEST_CHANNEL_LABEL: Record<RequestChannel, string> = {
  phone: 'Phone call',
  whatsapp: 'WhatsApp',
  website: 'Website',
  walk_in: 'Walk-in',
  internal: 'Internal',
  email: 'Email',
};

export interface OpsRequest {
  id: string;
  reference: string;
  channel: RequestChannel;
  kind: RequestKind;
  status: RequestStatus;
  priority: Priority;
  contact_name: string | null;
  contact_phone: string | null;
  subject: string;
  detail: string | null;
  resolution: string | null;
  assigned_staff_id: string | null;
  created_at: string;
}

export async function listRequests(openOnly = true): Promise<OpsRequest[]> {
  let query = supabase.from('galeyr_requests').select('*');
  if (openOnly) query = query.not('status', 'in', '(resolved,closed)');

  return rows<OpsRequest>(
    await query.order('priority', { ascending: false }).order('created_at'),
  );
}

export async function createRequest(input: {
  channel: RequestChannel;
  kind: RequestKind;
  priority: Priority;
  subject: string;
  detail?: string;
  contact_name?: string;
  contact_phone?: string;
}): Promise<void> {
  const { error } = await supabase.from('galeyr_requests').insert(input);
  if (error) throw new Error(error.message);
}

export async function updateRequest(
  id: string,
  patch: Partial<Pick<OpsRequest, 'status' | 'priority' | 'assigned_staff_id' | 'resolution'>>,
): Promise<void> {
  const { error } = await supabase.from('galeyr_requests').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Promotions — per restaurant                                                 */
/* -------------------------------------------------------------------------- */

export type PromotionKind =
  | 'discount' | 'new_item' | 'special_offer' | 'seasonal' | 'announcement' | 'event';

export const PROMOTION_KIND_LABEL: Record<PromotionKind, string> = {
  discount: 'Discount',
  new_item: 'New item',
  special_offer: 'Special offer',
  seasonal: 'Seasonal',
  announcement: 'Announcement',
  event: 'Community event',
};

export interface Promotion {
  id: string;
  restaurant_id: string;
  kind: PromotionKind;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_label: string | null;
  cta_label: string | null;
  cta_href: string | null;
  valid_from: string;
  valid_until: string | null;
  is_published: boolean;
  sort_order: number;
}

/**
 * A restaurant's live offers.
 *
 * No filter for published, in-date or restaurant-is-active is written here.
 * `galeyr_promotions_public_read` enforces all three, so an anonymous read
 * returns exactly what should be public. Repeating the conditions would create
 * a second place for the rule to drift.
 */
export async function listPromotions(restaurantId: string): Promise<Promotion[]> {
  return rows<Promotion>(
    await supabase
      .from('galeyr_promotions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
  );
}

/** Everything, including drafts and expired. Staff and the restaurant itself. */
export async function listPromotionsAdmin(restaurantId: string): Promise<Promotion[]> {
  return rows<Promotion>(
    await supabase
      .from('galeyr_promotions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order'),
  );
}

export async function savePromotion(
  promotion: Partial<Promotion> & { restaurant_id: string; title: string },
): Promise<void> {
  const { error } = promotion.id
    ? await supabase.from('galeyr_promotions').update(promotion).eq('id', promotion.id)
    : await supabase.from('galeyr_promotions').insert(promotion);

  if (error) throw new Error(error.message);
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('galeyr_promotions').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* -------------------------------------------------------------------------- */
/* Mobile apps                                                                 */
/* -------------------------------------------------------------------------- */

export interface AppRecord {
  id: string;
  key: 'customer' | 'courier' | 'restaurant';
  name: string;
  description: string | null;
  is_released: boolean;
  ios_url: string | null;
  android_url: string | null;
  latest_version: string | null;
  announcement: string | null;
}

/**
 * The GALEYR apps.
 *
 * All three are seeded `is_released = false` with null store URLs, and the UI
 * renders "Coming soon" wherever it finds that. There is no placeholder App
 * Store link anywhere — a link to a listing that does not exist is a claim the
 * app has shipped.
 */
export async function listApps(): Promise<AppRecord[]> {
  return rows<AppRecord>(await supabase.from('galeyr_apps').select('*').order('key'));
}

/* -------------------------------------------------------------------------- */
/* Customer support and complaints                                             */
/* -------------------------------------------------------------------------- */

/**
 * Raise a support request or a complaint from the public website.
 *
 * Goes through an RPC rather than a table insert. An anonymous INSERT policy on
 * `galeyr_requests` would let anyone set the channel, the priority and the
 * assigned staff member — so a member of the public could file something as
 * "urgent, internal, assigned to A2". The function fixes those fields: the
 * public describes the problem, triage stays with the Control Centre.
 *
 * Returns the reference (REQ-YYMMDD-NNNN) to quote on the phone.
 */
export async function submitCustomerRequest(input: {
  kind: RequestKind;
  subject: string;
  detail?: string;
  contactName?: string;
  contactPhone: string;
  orderNumber?: string;
}): Promise<string> {
  const { data, error } = await supabase.rpc('galeyr_submit_customer_request', {
    p_kind: input.kind,
    p_subject: input.subject,
    p_detail: input.detail ?? null,
    p_contact_name: input.contactName ?? null,
    p_contact_phone: input.contactPhone,
    p_order_number: input.orderNumber ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/* -------------------------------------------------------------------------- */
/* Courier applications                                                        */
/* -------------------------------------------------------------------------- */

export type VehicleType = 'motorbike' | 'bicycle' | 'car' | 'on_foot' | 'other';

export type CourierAppStatus =
  | 'new' | 'under_review' | 'verification' | 'more_info_needed'
  | 'approved' | 'rejected' | 'suspended';

export type BackgroundStatus =
  | 'not_started' | 'awaiting_consent' | 'submitted' | 'in_progress'
  | 'more_info_required' | 'completed_clear' | 'completed_further_review'
  | 'not_eligible';

export const VEHICLE_LABEL: Record<VehicleType, string> = {
  motorbike: 'Motorbike',
  bicycle: 'Bicycle',
  car: 'Car',
  on_foot: 'On foot',
  other: 'Other',
};

export const COURIER_STATUS_LABEL: Record<CourierAppStatus, string> = {
  new: 'New',
  under_review: 'Under review',
  verification: 'Verification',
  more_info_needed: 'More information needed',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
};

/**
 * Background-check statuses.
 *
 * These describe a HUMAN process — consent, enquiry, outcome — not an automated
 * lookup. GALEYR cannot query a criminal record database; no private company in
 * Somalia can. A status vocabulary that implied otherwise would produce a green
 * tick meaning nothing while the business believed a check had happened.
 */
export const BACKGROUND_STATUS_LABEL: Record<BackgroundStatus, string> = {
  not_started: 'Not started',
  awaiting_consent: 'Awaiting applicant consent',
  submitted: 'Submitted',
  in_progress: 'In progress',
  more_info_required: 'More information required',
  completed_clear: 'Completed — eligible',
  completed_further_review: 'Completed — further review',
  not_eligible: 'Not eligible',
};

export interface CourierApplication {
  id: string;
  reference: string;
  full_name: string;
  phone: string;
  email: string | null;
  date_of_birth: string | null;
  district: string | null;
  address_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  vehicle_type: VehicleType;
  vehicle_details: string | null;
  has_driving_licence: boolean;
  experience: string | null;
  availability: string | null;
  status: CourierAppStatus;
  background_status: BackgroundStatus;
  background_notes: string | null;
  info_requested: string | null;
  admin_notes: string | null;
  created_at: string;
}

export interface DocumentRequirement {
  id: string;
  applies_to: 'courier' | 'restaurant';
  key: string;
  label: string;
  description: string | null;
  is_required: boolean;
  sort_order: number;
}

/** What an applicant is asked to bring. Configured by an admin, not hard-coded. */
export async function listDocumentRequirements(
  appliesTo: 'courier' | 'restaurant',
): Promise<DocumentRequirement[]> {
  return rows<DocumentRequirement>(
    await supabase
      .from('galeyr_document_requirements')
      .select('*')
      .eq('applies_to', appliesTo)
      .order('sort_order'),
  );
}

export interface CourierApplicationInput {
  full_name: string;
  phone: string;
  email?: string;
  date_of_birth?: string;
  district?: string;
  address_notes?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  vehicle_type: VehicleType;
  vehicle_details?: string;
  has_driving_licence: boolean;
  experience?: string;
  availability?: string;
}

/**
 * Apply to be a courier.
 *
 * No `.select()` — see the note on submitApplication in galeyr.ts. RETURNING
 * needs a SELECT policy, and anonymous callers deliberately have none: these
 * rows hold a date of birth, a home district and an emergency contact.
 */
export async function submitCourierApplication(
  input: CourierApplicationInput,
): Promise<void> {
  const { error } = await supabase.from('galeyr_courier_applications').insert(input);
  if (error) throw new Error(error.message);
}

export async function listCourierApplications(): Promise<CourierApplication[]> {
  return rows<CourierApplication>(
    await supabase
      .from('galeyr_courier_applications')
      .select('*')
      .order('created_at', { ascending: false }),
  );
}

/** Approve, reject or move a courier application. Requires a staff confirmation token. */
export async function decideCourierApplication(
  applicationId: string,
  status: CourierAppStatus,
  token: string,
  notes?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('galeyr_decide_courier_application', {
    p_application_id: applicationId,
    p_status: status,
    p_token: token,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/** Record where a background check has got to. Separately audited from approval. */
export async function setBackgroundStatus(
  applicationId: string,
  status: BackgroundStatus,
  token: string,
  notes?: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('galeyr_set_background_status', {
    p_application_id: applicationId,
    p_status: status,
    p_token: token,
    p_notes: notes ?? null,
  });

  if (error) throw new Error(error.message);
  return data as string;
}

/** Ask an applicant for something more. Staff only. */
export async function requestFurtherInformation(
  applicationId: string,
  message: string,
): Promise<void> {
  const { error } = await supabase
    .from('galeyr_courier_applications')
    .update({
      status: 'more_info_needed',
      info_requested: message,
      info_requested_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  if (error) throw new Error(error.message);
}
