import { getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js';

import { COUNTRY_NAMES } from '@/src/lib/countryNames';

export interface CountryOption {
  cca2: CountryCode;
  name: string;
  callingCode: string;
  flag: string;
}

/** Regional Indicator Symbol trick: 'US' -> 🇺🇸, no image assets or extra package needed. */
export function flagEmoji(cca2: string): string {
  return cca2
    .toUpperCase()
    .replace(/./g, (letter) => String.fromCodePoint(127397 + letter.charCodeAt(0)));
}

let cached: CountryOption[] | null = null;

/** All countries libphonenumber-js knows a calling code for, with display name + flag. */
export function getAllCountryOptions(): CountryOption[] {
  if (cached) return cached;

  cached = getCountries()
    .map((cca2) => ({
      cca2,
      name: COUNTRY_NAMES[cca2] ?? cca2,
      callingCode: getCountryCallingCode(cca2),
      flag: flagEmoji(cca2),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return cached;
}

export function findCountryOption(cca2: CountryCode): CountryOption | undefined {
  return getAllCountryOptions().find((c) => c.cca2 === cca2);
}
