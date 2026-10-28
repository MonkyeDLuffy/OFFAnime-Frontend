/**
 * Site-wide constants shared by the footer and the static informational
 * pages (Contact, DMCA, Terms). Keeping them in one module guarantees the
 * disclaimer and contact address are reproduced identically everywhere they
 * appear.
 */

/** Brand name as written in the footer wordmark and disclaimer. */
export const SITE_NAME = "OFFANIME";

/** The single public contact/copyright address. */
export const SITE_EMAIL = "cinematicotaku59@gmail.com";

/** Short brand line used under the footer wordmark. */
export const SITE_TAGLINE =
  "Stream your favorite anime in a cinematic, premium experience — trending hits, seasonal favorites and all-time classics behind one glass-smooth interface.";

/**
 * The site's hosting disclaimer, reproduced verbatim in the footer (and
 * referenced by the DMCA / Terms pages). Do not reword — it is the site's
 * stated legal position.
 */
export const HOSTING_DISCLAIMER =
  "OFFANIME does not host any files, it merely pulls streams from 3rd party services. Legal issues should be taken up with the file hosts and providers. OFFANIME is not responsible for any media files shown by the video providers.";
