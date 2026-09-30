import type { RegistrationForm } from './types';

export type Errors = Partial<Record<keyof RegistrationForm | 'consent', string>>;

export const EMPTY_FORM: RegistrationForm = {
  fullName: '', fatherName: '', cnic: '', dob: '', gender: '', phone: '', email: '',
  city: '', address: '', level: '', program: '', institution: '', marks: '',
};

const EMAIL = /^\S+@\S+\.\S+$/;
export const isEmail = (v: string) => EMAIL.test(v);

/** Formats as-you-type input for fields that have a fixed shape. */
export function formatField(k: keyof RegistrationForm, v: string): string {
  if (k === 'cnic') {
    const d = v.replace(/\D/g, '').slice(0, 13);
    return d.length > 12 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  }
  if (k === 'phone') {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.length > 4 ? `${d.slice(0, 4)}-${d.slice(4)}` : d;
  }
  if (k === 'marks') return v.replace(/[^\d.]/g, '').slice(0, 5);
  return v;
}

/** Validates one step of the form. Mirrored server-side in `submit_registration`. */
export function validateStep(step: number, f: RegistrationForm, cities: string[], consent = false): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (f.fullName.trim().length < 3) e.fullName = 'Enter your full name';
    if (!f.fatherName.trim()) e.fatherName = "Enter your father's name";
    if (f.cnic.replace(/\D/g, '').length !== 13) e.cnic = 'CNIC / B-Form must be 13 digits';
    if (!f.dob) e.dob = 'Select your date of birth';
    if (!f.gender) e.gender = 'Select gender';
  }
  if (step === 1) {
    if (!/^03\d{9}$/.test(f.phone.replace(/\D/g, ''))) e.phone = 'Use format 03XX-XXXXXXX';
    if (!isEmail(f.email)) e.email = 'Enter a valid email';
    if (!cities.includes(f.city)) e.city = 'Select a city';
    if (f.address.trim().length < 5) e.address = 'Enter your address';
  }
  if (step === 2) {
    if (!f.level) e.level = 'Select a level';
    if (!f.program) e.program = 'Select a program category';
    if (!f.institution.trim()) e.institution = 'Enter your institution';
    const m = parseFloat(f.marks);
    if (isNaN(m) || m < 0 || m > 100) e.marks = 'Enter a percentage between 0 and 100';
  }
  if (step === 3 && !consent) e.consent = 'Please confirm your details';
  return e;
}

export function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

export function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
