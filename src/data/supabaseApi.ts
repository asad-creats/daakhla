import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import type { Admin, Api, RegistrationForm, RegistrationLink, Student } from './types';

// Row shapes — see supabase/migrations/0001_init.sql.
interface StudentRow {
  id: string; province: Student['province']; full_name: string; father_name: string; cnic: string; dob: string;
  gender: string; phone: string; email: string; city: string; address: string; level: string; program: string;
  institution: string; marks: number; status: Student['status']; created_at: string;
}

const toStudent = (r: StudentRow): Student => ({
  id: r.id, province: r.province, fullName: r.full_name, fatherName: r.father_name, cnic: r.cnic, dob: r.dob,
  gender: r.gender, phone: r.phone, email: r.email, city: r.city, address: r.address, level: r.level, program: r.program,
  institution: r.institution, marks: String(r.marks), status: r.status, ts: new Date(r.created_at).getTime(),
});

export function createSupabaseApi(url: string, anonKey: string): Api {
  const sb = createClient(url, anonKey);

  const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message); };
  const adminFor = async (uid: string): Promise<Admin | null> => {
    const { data, error } = await sb.from('admins').select('id, name, email, scope').eq('id', uid).maybeSingle();
    fail(error);
    return data as Admin | null;
  };

  return {
    mode: 'supabase',
    demoAccounts: () => [],

    async resolveLink(code) {
      // Students are anonymous, so links are looked up through an RPC rather than read directly.
      const { data, error } = await sb.rpc('resolve_link', { p_code: code });
      fail(error);
      return ((data as RegistrationLink[] | null) ?? [])[0] ?? null;
    },
    async submitRegistration(code, f: RegistrationForm) {
      const { data, error } = await sb.rpc('submit_registration', {
        p_code: code,
        p: {
          full_name: f.fullName, father_name: f.fatherName, cnic: f.cnic, dob: f.dob, gender: f.gender, phone: f.phone,
          email: f.email, city: f.city, address: f.address, level: f.level, program: f.program, institution: f.institution, marks: f.marks,
        },
      });
      // Class 23 = constraint violations (e.g. a city outside the link's province).
      if (error?.code?.startsWith('23')) throw new Error('Some details are missing or invalid');
      fail(error);
      return toStudent(data as StudentRow);
    },

    async currentAdmin() {
      const { data } = await sb.auth.getSession();
      return data.session ? adminFor(data.session.user.id) : null;
    },
    async signIn(email, password) {
      const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.status === 400 ? 'Email or password is incorrect' : error.message);
      const a = await adminFor(data.user.id);
      if (!a) { await sb.auth.signOut(); throw new Error('This account does not have admin access'); }
      return a;
    },
    async signOut() { await sb.auth.signOut(); },
    async listStudents() {
      // Row-level security limits this to the admin's regions.
      const { data, error } = await sb.from('students').select('*').order('created_at', { ascending: false });
      fail(error);
      return (data as StudentRow[]).map(toStudent);
    },
    async setStatus(id, status) {
      const { error } = await sb.from('students').update({ status }).eq('id', id);
      fail(error);
    },
    async listAdmins() {
      const { data, error } = await sb.from('admins').select('id, name, email, scope').order('created_at');
      fail(error);
      return data as Admin[];
    },
    async createAdmin(na) {
      const { data, error } = await sb.functions.invoke('create-admin', { body: na });
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        throw new Error(body?.error || 'Could not create admin');
      }
      fail(error);
      return data as Admin;
    },
    async listLinks() {
      // Row-level security: regional admins only see their own region's link.
      const { data, error } = await sb.from('registration_links').select('code, province').eq('active', true);
      fail(error);
      return (data ?? []) as RegistrationLink[];
    },
  };
}
