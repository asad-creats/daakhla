import { useEffect, useState } from 'react';
import { api } from '../data';
import { scopeShort } from '../data/constants';
import type { Admin as AdminT } from '../data/types';
import { initials } from '../data/validate';
import { cx } from '../components/ui';
import Dashboard from './Dashboard';

/** Admin area: shows sign-in until there is an admin session, then the dashboard. */
export default function Admin() {
  const [admin, setAdmin] = useState<AdminT | null | undefined>(undefined);

  useEffect(() => { api.currentAdmin().then(setAdmin, () => setAdmin(null)); }, []);

  if (admin === undefined) return <div className="center-msg">Loading…</div>;
  if (!admin) return <Login onSignedIn={setAdmin} />;
  return <Dashboard admin={admin} onSignOut={async () => { await api.signOut(); setAdmin(null); }} />;
}

function Login({ onSignedIn }: { onSignedIn: (a: AdminT) => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const demo = api.demoAccounts();

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setBusy(true);
    try { onSignedIn(await api.signIn(email, pw)); } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
      setBusy(false);
    }
  }

  return (
    <form className="login" data-screen-label="Admin login" onSubmit={submit}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="logo" lang="ur">داخلہ</div>
        <div className="stack">
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>Daakhla Admin</span>
          <span style={{ fontSize: 12 }} className="muted">Student registrations · Pakistan</span>
        </div>
      </div>
      <div className="stack" style={{ gap: 8, marginTop: 18 }}>
        <h1 className="title-xl">Sign in</h1>
        <p className="lede">Each admin sees the regions assigned to them.</p>
      </div>
      <label className="field">
        <span className="field-label">Email</span>
        <input className={cx('input', error && 'invalid')} type="email" autoComplete="username" value={email} placeholder="you@daakhla.pk"
          onChange={e => { setEmail(e.target.value); setError(''); }} />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input className={cx('input', error && 'invalid')} type="password" autoComplete="current-password" value={pw} placeholder="••••••••"
          onChange={e => { setPw(e.target.value); setError(''); }} />
      </label>
      {error && <span className="err-text" style={{ fontSize: 13, marginTop: -10 }}>{error}</span>}
      <button className="btn" type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>

      {demo.length > 0 && (
        <div className="stack" style={{ gap: 10, marginTop: 6 }}>
          <span className="eyebrow">Demo admin accounts · tap to fill</span>
          <div className="card card-18 list">
            {demo.map(a => (
              <button key={a.id} type="button" className="row" onClick={() => { setEmail(a.email); setPw(a.password); setError(''); }}>
                <span className="avatar">{initials(a.name)}</span>
                <span className="row-main"><span className="row-title">{a.name}</span><span className="row-sub">{a.email} · {a.password}</span></span>
                <span className="tag">{scopeShort(a.scope)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
}
