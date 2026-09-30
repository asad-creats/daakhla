import { LEVELS, LINK_CODES, PROGRAMS, PROVINCES, prov } from './constants';
import type { Admin, Api, DemoAccount, ProvinceCode, RegistrationForm, Student } from './types';
import { isEmail, validateStep } from './validate';

// Demo backend: everything lives in this browser's localStorage. Passwords are
// stored in plain text, so this is only for trying the app out.

const STORE = 'daakhla-v1';
const SESSION = 'daakhla-session';

const DEMO_ADMINS: DemoAccount[] = [
  { id: 'a1', name: 'Ayesha Siddiqui', email: 'ayesha@daakhla.pk', password: 'admin123', scope: 'all' },
  { id: 'a2', name: 'Bilal Chaudhry', email: 'bilal@daakhla.pk', password: 'punjab123', scope: 'PB' },
  { id: 'a3', name: 'Sana Memon', email: 'sana@daakhla.pk', password: 'sindh123', scope: 'SD' },
  { id: 'a4', name: 'Imran Khattak', email: 'imran@daakhla.pk', password: 'kp123', scope: 'KP' },
];

function seedStudents(): Student[] {
  let x = 11;
  const r = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const pick = <T,>(a: readonly T[]) => a[Math.floor(r() * a.length)];
  const M = ['Ahmed', 'Hamza', 'Usman', 'Ali', 'Bilal', 'Hassan', 'Zain', 'Faizan', 'Omer', 'Saad', 'Taimur', 'Junaid'];
  const F = ['Ayesha', 'Fatima', 'Hira', 'Zainab', 'Maryam', 'Sana', 'Mahnoor', 'Iqra', 'Areeba', 'Noor', 'Kinza', 'Laiba'];
  const L = ['Khan', 'Ahmed', 'Qureshi', 'Malik', 'Butt', 'Shah', 'Memon', 'Baloch', 'Khattak', 'Chaudhry', 'Siddiqui', 'Abbasi'];
  const inst: Record<ProvinceCode, string[]> = {
    PB: ['Punjab University', 'LUMS', 'UET Lahore', 'GC University'], SD: ['University of Karachi', 'NED University', 'IBA Karachi', 'Mehran UET'],
    KP: ['University of Peshawar', 'UET Peshawar', 'Khyber Medical University'], BL: ['University of Balochistan', 'BUITEMS'],
    IS: ['NUST', 'Quaid-i-Azam University', 'COMSATS'], GB: ['Karakoram International University'], AJ: ['University of AJK', 'MUST Mirpur'],
  };
  const W: Record<ProvinceCode, number> = { PB: 16, SD: 12, KP: 8, BL: 4, IS: 5, GB: 2, AJ: 3 };
  const out: Student[] = [];
  PROVINCES.forEach(p => {
    for (let i = 0; i < W[p.code]; i++) {
      const g = r() < 0.5 ? 'Female' : 'Male';
      const first = pick(g === 'Female' ? F : M), last = pick(L);
      const d = new Date(2026, 7, 1 + Math.floor(r() * 52));
      const cn = String(Math.floor(r() * 9e12 + 1e12));
      out.push({
        id: `${p.code}-26-${String(i + 1).padStart(4, '0')}`,
        fullName: `${first} ${last}`, fatherName: `${pick(M)} ${last}`,
        cnic: `${cn.slice(0, 5)}-${cn.slice(5, 12)}-${cn.slice(12)}`,
        dob: `${2004 + Math.floor(r() * 5)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`,
        gender: g, phone: `03${Math.floor(r() * 50 + 10)}-${Math.floor(r() * 9e6 + 1e6)}`,
        email: `${first.toLowerCase()}.${last.toLowerCase()}@mail.pk`,
        province: p.code, city: pick(p.cities), address: `House ${Math.floor(r() * 300 + 1)}, Street ${Math.floor(r() * 40 + 1)}`,
        level: pick(LEVELS), program: pick(PROGRAMS), institution: pick(inst[p.code]),
        marks: String(Math.floor(r() * 35 + 60)), status: r() < 0.62 ? 'Verified' : 'Pending', ts: d.getTime(),
      });
    }
  });
  return out;
}

interface Store { students: Student[]; admins: DemoAccount[] }

function load(): Store {
  try {
    const d = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (d && Array.isArray(d.students) && Array.isArray(d.admins)) return d;
  } catch { /* fall through to seed */ }
  return { students: seedStudents(), admins: DEMO_ADMINS.slice() };
}
function save(s: Store) { localStorage.setItem(STORE, JSON.stringify(s)); }

const strip = ({ password: _, ...a }: DemoAccount): Admin => a;
const links = () => PROVINCES.map(p => ({ code: LINK_CODES[p.code], province: p.code }));

export function createLocalApi(): Api {
  const me = (s: Store) => s.admins.find(a => a.id === localStorage.getItem(SESSION)) ?? null;
  const requireAdmin = (s: Store) => { const a = me(s); if (!a) throw new Error('Not signed in'); return a; };
  const inScope = (a: Admin, x: Student) => a.scope === 'all' || a.scope === x.province;

  return {
    mode: 'local',
    demoAccounts: () => load().admins,

    async resolveLink(code) { return links().find(l => l.code === code) ?? null; },
    async submitRegistration(code, form: RegistrationForm) {
      const link = links().find(l => l.code === code);
      if (!link) throw new Error('This registration link is not valid');
      const cities = prov(link.province).cities;
      for (const step of [0, 1, 2]) if (Object.keys(validateStep(step, form, cities)).length) throw new Error('Some details are missing or invalid');
      const s = load();
      const yy = String(new Date().getFullYear() % 100).padStart(2, '0');
      const prefix = `${link.province}-${yy}-`;
      const seq = Math.max(0, ...s.students.filter(x => x.id.startsWith(prefix)).map(x => +x.id.slice(prefix.length))) + 1;
      const st: Student = { ...form, fullName: form.fullName.trim(), id: prefix + String(seq).padStart(4, '0'), province: link.province, status: 'Pending', ts: Date.now() };
      save({ ...s, students: [st, ...s.students] });
      return st;
    },

    async currentAdmin() { const a = me(load()); return a && strip(a); },
    async signIn(email, password) {
      const a = load().admins.find(x => x.email.toLowerCase() === email.trim().toLowerCase() && x.password === password);
      if (!a) throw new Error('Email or password is incorrect');
      localStorage.setItem(SESSION, a.id);
      return strip(a);
    },
    async signOut() { localStorage.removeItem(SESSION); },
    async listStudents() { const s = load(), a = requireAdmin(s); return s.students.filter(x => inScope(a, x)); },
    async setStatus(id, status) {
      const s = load(), a = requireAdmin(s);
      save({ ...s, students: s.students.map(x => x.id === id && inScope(a, x) ? { ...x, status } : x) });
    },
    async listAdmins() { const s = load(); requireAdmin(s); return s.admins.map(strip); },
    async createAdmin(na) {
      const s = load();
      if (requireAdmin(s).scope !== 'all') throw new Error('Only super admins can add accounts');
      if (!na.name.trim() || !isEmail(na.email) || na.password.length < 6) throw new Error('Name, valid email and a 6+ character password are required');
      if (s.admins.some(a => a.email.toLowerCase() === na.email.toLowerCase())) throw new Error('An admin with this email already exists');
      const a: DemoAccount = { ...na, name: na.name.trim(), id: 'a' + Date.now() };
      save({ ...s, admins: [...s.admins, a] });
      return strip(a);
    },
    async listLinks() { const a = requireAdmin(load()); return links().filter(l => a.scope === 'all' || l.province === a.scope); },
  };
}
