import { createLocalApi } from './localApi';
import { createSupabaseApi } from './supabaseApi';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const api = url && key ? createSupabaseApi(url, key) : createLocalApi();

const base = ((import.meta.env.VITE_PUBLIC_FORM_BASE as string | undefined) || window.location.origin).replace(/\/$/, '');

/** Full URL of a region's registration form. */
export const formUrl = (code: string) => `${base}/r/${code}`;
/** The same URL without the scheme, for display. */
export const displayUrl = (code: string) => formUrl(code).replace(/^https?:\/\//, '');
