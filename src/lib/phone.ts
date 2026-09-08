import * as Localization from 'expo-localization';
import {
  AsYouType,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

/** Device locale's region, used to preselect the country in the phone entry dropdown. */
export function detectDefaultCountry(): CountryCode {
  const region = Localization.getLocales()[0]?.regionCode;
  return (region as CountryCode | null) ?? 'US';
}

/** National-format display string as the user types raw digits, e.g. '4155550132' -> '(415) 555-0132'. */
export function formatNationalInput(country: CountryCode, digits: string): string {
  if (!digits) return '';
  return new AsYouType(country).input(digits);
}

export function isValidNationalNumber(country: CountryCode, digits: string): boolean {
  if (!digits) return false;
  return isValidPhoneNumber(digits, country);
}

/** E.164 string (e.g. '+14155550132'), or null if the number isn't parseable yet. */
export function toE164(country: CountryCode, digits: string): string | null {
  return parsePhoneNumberFromString(digits, country)?.number ?? null;
}

/**
 * Inverse of `toE164`: splits a stored number back into the country + national
 * digits the entry row edits, so a "change your number" flow can prefill the field
 * the user last confirmed instead of starting them from an empty input.
 * Returns null when the string isn't a parseable E.164 number.
 */
export function parseE164(e164: string): { country: CountryCode; nationalNumber: string } | null {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed?.country) return null;
  return { country: parsed.country, nationalNumber: parsed.nationalNumber };
}

/**
 * Display form of a stored number: '+14155550132' -> '+1 (415) 555-0132', the shape
 * settings 1mb/1mc show. Numbers are persisted as E.164, which reads as an
 * undifferentiated digit string, so anywhere a saved phone is shown to the user
 * should go through here. Falls back to the raw input when it can't be parsed.
 */
export function formatE164ForDisplay(e164: string | null | undefined): string | null {
  if (!e164) return null;
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;

  // The mockups show a US number as '+1 (415) 555-0132', which is `formatNational()`
  // behind the calling code. That only generalises within the NANP: elsewhere
  // `formatNational()` keeps a trunk '0' that must not follow a calling code
  // ('+44 07911 123456' is wrong), so every other region uses the international form.
  if (parsed.countryCallingCode === '1') {
    return `+1 ${parsed.formatNational()}`;
  }
  return parsed.formatInternational();
}
