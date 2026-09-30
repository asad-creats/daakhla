export type ProvinceCode = 'PB' | 'SD' | 'KP' | 'BL' | 'IS' | 'GB' | 'AJ';
export type Scope = ProvinceCode | 'all';
export type Status = 'Pending' | 'Verified';

/** What a student enters on the registration form. */
export interface RegistrationForm {
  fullName: string;
  fatherName: string;
  cnic: string;
  dob: string;
  gender: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  level: string;
  program: string;
  institution: string;
  marks: string;
}

export interface Student extends RegistrationForm {
  id: string;
  province: ProvinceCode;
  status: Status;
  /** Submission time, ms since epoch. */
  ts: number;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  scope: Scope;
}

export interface RegistrationLink {
  code: string;
  province: ProvinceCode;
}

export interface NewAdmin {
  name: string;
  email: string;
  password: string;
  scope: Scope;
}

export interface DemoAccount extends Admin {
  password: string;
}

export interface Api {
  mode: 'local' | 'supabase';
  /** Demo credentials to show on the sign-in screen (local mode only). */
  demoAccounts(): DemoAccount[];

  // Public: used by the student form.
  resolveLink(code: string): Promise<RegistrationLink | null>;
  submitRegistration(code: string, form: RegistrationForm): Promise<Student>;

  // Admin: results are limited to the signed-in admin's scope.
  currentAdmin(): Promise<Admin | null>;
  signIn(email: string, password: string): Promise<Admin>;
  signOut(): Promise<void>;
  listStudents(): Promise<Student[]>;
  setStatus(id: string, status: Status): Promise<void>;
  listAdmins(): Promise<Admin[]>;
  createAdmin(a: NewAdmin): Promise<Admin>;
  listLinks(): Promise<RegistrationLink[]>;
}

export const roleOf = (scope: Scope) => (scope === 'all' ? 'Super admin' : 'Regional admin');
