/**
 * Application-wide constants.
 *
 * Centralizing these here prevents "magic numbers" scattered across the
 * codebase and makes it trivial to tune durations / sizes / thresholds in
 * one place.
 *
 * Conventions:
 *   - UPPER_SNAKE_CASE for primitives
 *   - ms  = milliseconds
 *   - s   = seconds
 *   - sec = seconds (alternative when "s" reads ambiguously)
 */

/* ----------------------------------------------------------------------------
 * Time — durations
 * ------------------------------------------------------------------------- */

/** One second in milliseconds. */
export const ONE_SECOND_MS = 1_000;

/** One minute in milliseconds. */
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS;

/** One hour in milliseconds. */
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;

/** One day in milliseconds. */
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/** One week in milliseconds. */
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;

/* ----------------------------------------------------------------------------
 * UI — toast / feedback durations
 * ------------------------------------------------------------------------- */

/** Auto-dismiss duration for standard toast / success banners (ms). */
export const TOAST_DURATION_MS = 3_500;

/** Auto-dismiss duration for "copied to clipboard" feedback (ms). */
export const COPY_FEEDBACK_DURATION_MS = 2_000;

/** Auto-dismiss duration for "saved successfully" banners — longer so the
 *  user has time to read the success state (ms). */
export const SAVE_SUCCESS_DURATION_MS = 4_000;

/* ----------------------------------------------------------------------------
 * UI — polling & cache
 * ------------------------------------------------------------------------- */

/** How often the notification bell polls for new notifications (ms). */
export const NOTIFICATION_POLL_INTERVAL_MS = 30 * ONE_SECOND_MS;

/** Default stale time for TanStack Query (ms). 5 min means the same query
 *  won't refetch on remount unless data is older than 5 min. */
export const DEFAULT_STALE_TIME_MS = 5 * ONE_MINUTE_MS;

/* ----------------------------------------------------------------------------
 * Pagination / list sizes
 * ------------------------------------------------------------------------- */

/** Default page size for paginated list endpoints. */
export const DEFAULT_PAGE_SIZE = 20;

/** Larger page size used when populating dropdown selectors so the user
 *  doesn't need to paginate to find common records. */
export const DROPDOWN_PAGE_SIZE = 50;

/** Very large page size used when we essentially want "all" records in a
 *  single fetch (e.g., for full calendar view, reports aggregation). */
export const LARGE_PAGE_SIZE = 100;

/* ----------------------------------------------------------------------------
 * Finance
 * ------------------------------------------------------------------------- */

/** Fallback VAT / tax rate (%) used when we cannot derive it from an
 *  invoice's base/tax amounts. */
export const DEFAULT_TAX_RATE_PERCENT = 15;

/* ----------------------------------------------------------------------------
 * Number formatting (Reports)
 * ------------------------------------------------------------------------- */

/** Threshold above which a number is rendered in millions (1M). */
export const MILLION_FORMAT_THRESHOLD = 1_000_000;

/** Threshold above which a number is rendered in thousands (1K). */
export const THOUSAND_FORMAT_THRESHOLD = 1_000;

/** Decimal precision used when formatting compact numbers like 1.2M / 3.4K. */
export const COMPACT_NUMBER_DECIMALS = 1;

/* ----------------------------------------------------------------------------
 * Animations
 * ------------------------------------------------------------------------- */

/** Duration of the animated number counter on the landing page (ms). */
export const LANDING_COUNTER_DURATION_MS = 2_000;
