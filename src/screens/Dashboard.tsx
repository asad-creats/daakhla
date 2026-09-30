import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, displayUrl, formUrl } from '../data';
import { PROGRAMS, PROVINCES, prov, scopeLabel, scopeShort } from '../data/constants';
import { roleOf, type Admin, type NewAdmin, type RegistrationLink, type Scope, type Status, type Student } from '../data/types';
import { fmtDate, initials } from '../data/validate';
import { Icon, QrCode, Sheet, copyText, cx, downloadQrPng, useToast } from '../components/ui';

type Tab = 'overview' | 'students' | 'links' | 'admins';
interface Filters { region: string; prog: string; status: 'all' | Status; q: string }
const NO_FILTERS: Filters = { region: 'all', prog: 'all', status: 'all', q: '' };

const TABS: [Tab, string, string][] = [['overview', 'Overview', '◐'], ['students', 'Students', '≡'], ['links', 'Links', '⌗'], ['admins', 'Admins', '◎']];

export default function Dashboard({ admin, onSignOut }: { admin: Admin; onSignOut: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>((location.state as { tab?: Tab } | null)?.tab ?? 'overview');
  const [students, setStudents] = useState<Student[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selId, setSelId] = useState<string | null>(null);
  const [qrLink, setQrLink] = useState<RegistrationLink | null>(null);
  const { flash, node: toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    api.listStudents().then(s => { setStudents(s); setLoadError(''); }, e => setLoadError(e.message));
  }, []);
  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, [load]);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [tab]);

  const openStudents = (f: Partial<Filters>) => { setFilters({ ...NO_FILTERS, ...f }); setTab('students'); };
  const copy = async (code: string) => flash((await copyText(formUrl(code))) ? 'Link copied' : 'Could not copy link');

  async function toggleStatus(s: Student) {
    const status: Status = s.status === 'Verified' ? 'Pending' : 'Verified';
    setStudents(list => list && list.map(x => x.id === s.id ? { ...x, status } : x));
    try { await api.setStatus(s.id, status); } catch (e) {
      setStudents(list => list && list.map(x => x.id === s.id ? { ...x, status: s.status } : x));
      flash(e instanceof Error ? e.message : 'Could not update status');
    }
  }

  const all = students ?? [];
  const sel = all.find(x => x.id === selId);

  return (
    <div className="screen" data-screen-label="Admin dashboard">
      <div ref={scrollRef} className="scroll stack">
        {loadError && <div className="center-msg" style={{ color: 'var(--err)' }}>{loadError}</div>}
        {!loadError && students === null && tab !== 'admins' && <div className="center-msg">Loading…</div>}
        {students && tab === 'overview' && <Overview admin={admin} students={all} onOpen={openStudents} />}
        {students && tab === 'students' && <Students admin={admin} students={all} filters={filters} setFilters={setFilters} onSelect={setSelId} />}
        {students && tab === 'links' && (
          <Links students={all} onCopy={copy} onQr={setQrLink} onPreview={code => navigate(`/r/${code}?preview=1`)} />
        )}
        {tab === 'admins' && <Admins admin={admin} onSignOut={onSignOut} />}
      </div>

      <nav className="tabbar">
        {TABS.map(([k, label, glyph]) => (
          <button key={k} className={cx(tab === k && 'on')} aria-current={tab === k ? 'page' : undefined} onClick={() => { setTab(k); setSelId(null); }}>
            <span className="tab-glyph" aria-hidden>{glyph}</span>
            <span className="tab-label">{label}</span>
          </button>
        ))}
      </nav>

      {qrLink && (
        <Sheet onClose={() => setQrLink(null)}>
          <div className="sheet stack" style={{ padding: '10px 20px calc(var(--bottom) + 16px)', alignItems: 'center', gap: 16 }}>
            <div className="grabber" />
            <div className="stack" style={{ alignItems: 'center', gap: 4, textAlign: 'center' }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{prov(qrLink.province).name}</span>
              <span style={{ fontSize: 13 }} className="muted">Students scan to open the {prov(qrLink.province).name} form</span>
            </div>
            <div className="qr-large"><QrCode text={formUrl(qrLink.code)} /></div>
            <span className="mono" style={{ fontSize: 13, color: 'var(--green)', textAlign: 'center', overflowWrap: 'anywhere' }}>{displayUrl(qrLink.code)}</span>
            <div className="grid-2" style={{ gap: 10, width: '100%' }}>
              <button className="btn btn-md ghost" onClick={() => copy(qrLink.code)}>Copy link</button>
              <button className="btn btn-md" onClick={() => downloadQrPng(formUrl(qrLink.code), `daakhla-${qrLink.code}-qr.png`).then(() => flash('QR image saved'))}>Save QR image</button>
            </div>
          </div>
        </Sheet>
      )}

      {sel && (
        <Sheet onClose={() => setSelId(null)}>
          <div className="sheet stack" style={{ maxHeight: '86%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}><div className="grabber" /></div>
            <div className="stack" style={{ overflow: 'auto', padding: '10px 20px 20px', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span className="avatar solid" style={{ width: 54, height: 54, fontSize: 18 }}>{initials(sel.fullName)}</span>
                <span className="row-main" style={{ gap: 3 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em' }}>{sel.fullName}</span>
                  <span className="mono muted" style={{ fontSize: 12 }}>{sel.id} · {fmtDate(sel.ts)}</span>
                </span>
                <span className={cx('status', sel.status === 'Pending' && 'pending')} style={{ fontSize: 12, padding: '4px 9px' }}>{sel.status}</span>
              </div>
              {[
                { title: 'Personal', rows: [["Father's name", sel.fatherName], ['CNIC / B-Form', sel.cnic], ['Date of birth', sel.dob], ['Gender', sel.gender]] },
                { title: 'Contact & region', rows: [['Mobile', sel.phone], ['Email', sel.email], ['City', sel.city], ['Province', prov(sel.province).name], ['Address', sel.address]] },
                { title: 'Academic', rows: [['Level', sel.level], ['Program', sel.program], ['Institution', sel.institution], ['Last result', sel.marks + '%']] },
              ].map(sec => (
                <div key={sec.title} className="card card-18" style={{ padding: '4px 16px' }}>
                  <div className="eyebrow" style={{ padding: '10px 0 6px' }}>{sec.title}</div>
                  {sec.rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
                </div>
              ))}
            </div>
            <div className="sheet-foot">
              <button className="btn btn-md ghost" onClick={() => setSelId(null)}>Close</button>
              <button className="btn btn-md" onClick={() => toggleStatus(sel)}>{sel.status === 'Verified' ? 'Mark pending' : 'Verify student'}</button>
            </div>
          </div>
        </Sheet>
      )}
      {toast}
    </div>
  );
}

function Overview({ admin, students, onOpen }: { admin: Admin; students: Student[]; onOpen: (f: Partial<Filters>) => void }) {
  const byCity = admin.scope !== 'all';
  const keys = byCity ? prov(admin.scope as Exclude<Scope, 'all'>).cities : PROVINCES.map(p => p.code);
  const rows = keys
    .map(k => ({ k, name: byCity ? k : prov(k as Student['province']).name, count: students.filter(x => (byCity ? x.city : x.province) === k).length }))
    .sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...rows.map(r => r.count));
  const pending = students.filter(x => x.status === 'Pending').length;

  return (
    <div className="page" style={{ gap: 22 }}>
      <div className="stack" style={{ gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }} className="muted">Salam, {admin.name.split(' ')[0]}</span>
        <h1 className="title-lg">{scopeLabel(admin.scope)}</h1>
      </div>
      <div className="hero">
        <div className="stack" style={{ gap: 2 }}>
          <span style={{ fontSize: 13, color: '#BFE0CC', fontWeight: 600 }}>Total registrations</span>
          <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1 }}>{students.length}</span>
        </div>
        <div className="grid-2" style={{ gap: 10 }}>
          <button className="hero-tile" onClick={() => onOpen({ status: 'Pending' })}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>{pending}</span>
            <span style={{ fontSize: 12, color: '#DCEFE3', fontWeight: 600 }}>Awaiting review</span>
          </button>
          <div className="hero-tile">
            <span style={{ fontSize: 22, fontWeight: 800 }}>{students.length - pending}</span>
            <span style={{ fontSize: 12, color: '#DCEFE3', fontWeight: 600 }}>Verified</span>
          </div>
        </div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">{byCity ? 'By city' : 'By province / region'}</span>
        <div className="card list">
          {rows.map(r => (
            <button key={r.k} className="row bar-row" onClick={() => onOpen({ region: r.k })}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{r.name}</span>
                <span style={{ fontSize: 14, fontWeight: 800 }}>{r.count}</span>
              </div>
              <div className="bar"><div style={{ width: `${Math.round(r.count / max * 100)}%` }} /></div>
            </button>
          ))}
        </div>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <span className="eyebrow">By program</span>
        <div className="grid-2" style={{ gap: 10 }}>
          {PROGRAMS.map(p => (
            <button key={p} className="tile" onClick={() => onOpen({ prog: p })}>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em' }}>{students.filter(x => x.program === p).length}</span>
              <span style={{ fontSize: 13, fontWeight: 600 }} className="muted">{p}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Students({ admin, students, filters: f, setFilters, onSelect }: {
  admin: Admin; students: Student[]; filters: Filters; setFilters: (f: Filters) => void; onSelect: (id: string) => void;
}) {
  const set = (p: Partial<Filters>) => setFilters({ ...f, ...p });
  const regionOpts = admin.scope === 'all'
    ? PROVINCES.map(p => ({ v: p.code as string, l: p.short }))
    : prov(admin.scope).cities.map(c => ({ v: c, l: c }));

  const q = f.q.trim().toLowerCase();
  const list = students.filter(x =>
    (f.region === 'all' || x.province === f.region || x.city === f.region)
    && (f.prog === 'all' || x.program === f.prog)
    && (f.status === 'all' || x.status === f.status)
    && (!q || [x.fullName, x.id, x.cnic, x.institution].join(' ').toLowerCase().includes(q)));

  const groups = new Map<string, Student[]>();
  list.slice().sort((a, b) => b.ts - a.ts).forEach(x => {
    const k = x.province + '|' + x.city;
    groups.set(k, [...(groups.get(k) ?? []), x]);
  });
  const sorted = [...groups.values()].sort((a, b) => b.length - a.length);

  return <>
    <div className="sticky-head">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h1 className="title-md">Students</h1>
        <span style={{ fontSize: 13, fontWeight: 700 }} className="muted">{list.length} shown</span>
      </div>
      <div className="search">
        {Icon.search}
        <input value={f.q} onChange={e => set({ q: e.target.value })} placeholder="Name, ID, CNIC or institution" aria-label="Search students" />
      </div>
      <div className="chips">
        {[{ v: 'all', l: 'All' }, ...regionOpts].map(o => (
          <button key={o.v} className={cx('chip', f.region === o.v && 'on')} onClick={() => set({ region: o.v })}>{o.l}</button>
        ))}
      </div>
      <div className="chips">
        {[{ v: 'all', l: 'All programs' }, ...PROGRAMS.map(p => ({ v: p as string, l: p }))].map(o => (
          <button key={o.v} className={cx('chip chip-sq', f.prog === o.v && 'on')} onClick={() => set({ prog: o.v })}>{o.l}</button>
        ))}
        <button className={cx('chip chip-sq', f.status === 'Pending' && 'on')} onClick={() => set({ status: f.status === 'Pending' ? 'all' : 'Pending' })}>Pending only</button>
      </div>
    </div>
    <div className="stack" style={{ padding: '8px 20px 28px', gap: 18 }}>
      {list.length === 0 && <div style={{ padding: '40px 0', textAlign: 'center', fontSize: 14 }} className="muted">No students match these filters.</div>}
      {sorted.map(items => (
        <div key={items[0].province + items[0].city} className="stack" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '8px 2px 0' }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>
              {items[0].city} <span style={{ fontSize: 13, fontWeight: 600 }} className="muted">· {prov(items[0].province).short}</span>
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--green)' }}>{items.length}</span>
          </div>
          <div className="card card-18 list">
            {items.map(s => (
              <button key={s.id} className="row" onClick={() => onSelect(s.id)}>
                <span className="avatar" style={{ width: 38, height: 38 }}>{initials(s.fullName)}</span>
                <span className="row-main" style={{ gap: 2 }}>
                  <span className="row-title ellipsis">{s.fullName}</span>
                  <span className="row-sub ellipsis">{s.program} · {s.level}</span>
                </span>
                <span className="stack" style={{ flex: 'none', alignItems: 'flex-end', gap: 4 }}>
                  <span className="mono muted" style={{ fontSize: 11 }}>{s.id}</span>
                  <span className={cx('status', s.status === 'Pending' && 'pending')}>{s.status}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  </>;
}

function Links({ students, onCopy, onQr, onPreview }: {
  students: Student[]; onCopy: (code: string) => void; onQr: (l: RegistrationLink) => void; onPreview: (code: string) => void;
}) {
  const [links, setLinks] = useState<RegistrationLink[] | null>(null);
  useEffect(() => { api.listLinks().then(setLinks, () => setLinks([])); }, []);
  const order = (l: RegistrationLink) => PROVINCES.findIndex(p => p.code === l.province);

  return (
    <div className="page" style={{ gap: 18 }}>
      <div className="stack" style={{ gap: 6 }}>
        <h1 className="title-md">Registration links</h1>
        <p className="lede" style={{ fontSize: 14 }}>Share a region's link or QR code with students. Every submission is filed under that region automatically.</p>
      </div>
      {links === null && <div className="muted" style={{ fontSize: 14 }}>Loading…</div>}
      {links?.slice().sort((a, b) => order(a) - order(b)).map(l => {
        const inRegion = students.filter(x => x.province === l.province);
        return (
          <div key={l.code} className="card stack" style={{ padding: 16, gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              <button className="qr-thumb" onClick={() => onQr(l)} aria-label={`Show QR code for ${prov(l.province).name}`}><QrCode text={formUrl(l.code)} /></button>
              <div className="row-main" style={{ gap: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.01em' }}>{prov(l.province).name}</span>
                <span className="mono ellipsis" style={{ fontSize: 12, color: 'var(--green)' }}>{displayUrl(l.code)}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }} className="muted">{inRegion.length} registrations · {inRegion.filter(x => x.status === 'Pending').length} pending</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <button className="btn btn-sm ghost" onClick={() => onCopy(l.code)}>Copy link</button>
              <button className="btn btn-sm ghost" onClick={() => onQr(l)}>QR code</button>
              <button className="btn btn-sm btn-soft" onClick={() => onPreview(l.code)}>Preview form</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const EMPTY_ADMIN: NewAdmin = { name: '', email: '', password: '', scope: 'PB' };

function Admins({ admin, onSignOut }: { admin: Admin; onSignOut: () => void }) {
  const [admins, setAdmins] = useState<Admin[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [na, setNa] = useState<NewAdmin>(EMPTY_ADMIN);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const canManage = admin.scope === 'all';

  useEffect(() => { api.listAdmins().then(setAdmins, e => setError(e.message)); }, []);
  const setField = (k: keyof NewAdmin) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { setNa({ ...na, [k]: e.target.value }); setError(''); };

  async function create() {
    setBusy(true);
    try {
      const a = await api.createAdmin(na);
      setAdmins(list => [...(list ?? []), a]);
      setShowAdd(false);
      setNa(EMPTY_ADMIN);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create admin'); }
    setBusy(false);
  }

  return (
    <div className="page" style={{ gap: 20 }}>
      <h1 className="title-md">Admin accounts</h1>
      <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="avatar solid" style={{ width: 46, height: 46, fontSize: 15 }}>{initials(admin.name)}</span>
        <span className="row-main">
          <span style={{ fontSize: 15, fontWeight: 800 }}>{admin.name}</span>
          <span className="row-sub">{roleOf(admin.scope)} · {scopeLabel(admin.scope)}</span>
        </span>
        <button onClick={onSignOut} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: '1.5px solid var(--line)', background: '#fff', color: 'var(--err)', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>Sign out</button>
      </div>
      <div className="stack" style={{ gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="eyebrow">All admins · {admins?.length ?? '…'}</span>
          {canManage && <button className="link-btn" onClick={() => { setShowAdd(!showAdd); setError(''); }}>{showAdd ? 'Cancel' : '+ Add admin'}</button>}
        </div>
        {showAdd && canManage && (
          <div className="card stack" style={{ borderColor: 'var(--green)', padding: 16, gap: 10 }}>
            <input className="input input-sm" value={na.name} onChange={setField('name')} placeholder="Full name" />
            <input className="input input-sm" type="email" value={na.email} onChange={setField('email')} placeholder="Email" />
            <input className="input input-sm" value={na.password} onChange={setField('password')} placeholder="Temporary password" autoComplete="new-password" />
            <select className="select" value={na.scope} onChange={setField('scope')}>
              <option value="all">All regions (Super admin)</option>
              {PROVINCES.map(p => <option key={p.code} value={p.code}>{p.name} only</option>)}
            </select>
            {error && <span className="err-text">{error}</span>}
            <button className="btn btn-md" style={{ height: 48 }} onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create admin'}</button>
          </div>
        )}
        {!showAdd && error && <span className="err-text">{error}</span>}
        <div className="card list">
          {admins?.map(a => (
            <div key={a.id} className="row">
              <span className="avatar">{initials(a.name)}</span>
              <span className="row-main">
                <span className="row-title">{a.name}{a.id === admin.id ? ' (you)' : ''}</span>
                <span className="row-sub">{a.email}</span>
              </span>
              <span className="tag">{scopeShort(a.scope)}</span>
            </div>
          ))}
        </div>
        {!canManage && <span style={{ fontSize: 12 }} className="muted">Only super admins can add accounts.</span>}
      </div>
    </div>
  );
}
