import type { ProvinceCode } from './types';

export interface Province {
  code: ProvinceCode;
  name: string;
  short: string;
  cities: string[];
}

export const PROVINCES: Province[] = [
  { code: 'PB', name: 'Punjab', short: 'Punjab', cities: ['Lahore', 'Rawalpindi', 'Faisalabad', 'Multan', 'Gujranwala'] },
  { code: 'SD', name: 'Sindh', short: 'Sindh', cities: ['Karachi', 'Hyderabad', 'Sukkur', 'Larkana'] },
  { code: 'KP', name: 'Khyber Pakhtunkhwa', short: 'KP', cities: ['Peshawar', 'Abbottabad', 'Mardan', 'Swat'] },
  { code: 'BL', name: 'Balochistan', short: 'Balochistan', cities: ['Quetta', 'Gwadar', 'Turbat'] },
  { code: 'IS', name: 'Islamabad Capital Territory', short: 'Islamabad', cities: ['Islamabad'] },
  { code: 'GB', name: 'Gilgit-Baltistan', short: 'GB', cities: ['Gilgit', 'Skardu', 'Hunza'] },
  { code: 'AJ', name: 'Azad Jammu & Kashmir', short: 'AJK', cities: ['Muzaffarabad', 'Mirpur'] },
];

export const PROGRAMS = ['Computer Science', 'Engineering', 'Medical', 'Business', 'Arts & Humanities'] as const;
export const LEVELS = ['Matric', 'Intermediate', "Bachelor's", "Master's"] as const;
export const GENDERS = ['Female', 'Male'] as const;
export const STEPS = ['Personal details', 'Contact & region', 'Academic details', 'Review & submit'];

/** Default link codes; the Supabase backend stores its own in `registration_links`. */
export const LINK_CODES: Record<ProvinceCode, string> = {
  PB: 'pb-7k2q', SD: 'sd-4m9x', KP: 'kp-2r8t', BL: 'bl-9c3v', IS: 'is-5h1w', GB: 'gb-8n6p', AJ: 'aj-3d7z',
};

export function prov(code: ProvinceCode): Province {
  return PROVINCES.find(p => p.code === code)!;
}

export function scopeLabel(scope: ProvinceCode | 'all') {
  return scope === 'all' ? 'All of Pakistan' : prov(scope).name;
}

export function scopeShort(scope: ProvinceCode | 'all') {
  return scope === 'all' ? 'All regions' : prov(scope).short;
}
