/**
 * @deprecated Superseded by CommunityShowcase.
 *
 * This used to render a single advertising banner in its own section below the
 * service cards. It has been replaced by the Community Advertising Showcase,
 * which rotates through every live item and sits directly under the hero.
 *
 * The file survives only because the folder it lives in is OneDrive-synced and
 * would not allow the delete. It is not imported anywhere, so the bundler drops
 * it — verified by checking the built output. Delete it when you next have the
 * directory unlocked.
 */

export { CommunityShowcase as FeaturedBanner } from '@/components/marketing/CommunityShowcase';
