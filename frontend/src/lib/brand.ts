/**
 * Brand & contact fallback values.
 *
 * These are used ONLY when the studio settings haven't been configured yet
 * (e.g., first run, before the user fills in Settings). In normal operation
 * the actual values come from the API `/settings/studio` endpoint.
 *
 * Centralizing them here means we can change the fallback identity in one
 * place instead of hunting through every component.
 */

/** Fallback studio display name (used in navbar, login, footer, invoices). */
export const BRAND_NAME = 'REAL HOME LENS';

/** Fallback contact phone (E.164-ish format). */
export const BRAND_PHONE = '+966 50 000 0000';

/** Fallback WhatsApp number (digits only, used to build wa.me links). */
export const BRAND_WHATSAPP = '966500000000';

/** Fallback contact email. */
export const BRAND_EMAIL = 'info@realhomelens.com';

/** Fallback website (display only). */
export const BRAND_WEBSITE = 'www.realhomelens.com';

/** Fallback city/region for display. */
export const BRAND_LOCATION = 'الرياض، المملكة العربية السعودية';

/** Fallback VAT registration number (display on invoices). */
export const BRAND_VAT_NUMBER = '300984729100003';

/** Fallback CR (Commercial Registration) number. */
export const BRAND_CR_NUMBER = '1010894721';

/** Fallback bank name. */
export const BRAND_BANK_NAME = 'مصرف الراجحي / Al Rajhi Bank';

/** Fallback IBAN. */
export const BRAND_IBAN = 'SA4480000456608010123456';
