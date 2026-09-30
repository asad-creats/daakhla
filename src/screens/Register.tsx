import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, displayUrl } from '../data';
import { GENDERS, LEVELS, PROGRAMS, STEPS, prov } from '../data/constants';
import type { RegistrationForm, RegistrationLink, Student } from '../data/types';
import { EMPTY_FORM, formatField, validateStep, type Errors } from '../data/validate';
import { Group, Icon, TextField, cx } from '../components/ui';

export default function Register() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const isPreview = params.get('preview') === '1';
  const exitPreview = () => navigate('/', { state: { tab: 'links' } });

  const [link, setLink] = useState<RegistrationLink | null | undefined>(undefined);
  const [done, setDone] = useState<Student | null>(null);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    let live = true;
    setLink(undefined);
    api.resolveLink(code).then(l => live && setLink(l), () => live && setLink(null));
    return () => { live = false; };
  }, [code]);

  if (link === undefined) return <div className="center-msg">Loading…</div>;
  if (link === null) {
    return (
      <div className="success" data-screen-label="Invalid link">
        <h1 className="title-xl">Link not found</h1>
        <p className="lede">This registration link is invalid or no longer active. Ask your admissions office for a new link or QR code.</p>
      </div>
    );
  }
  if (done) {
    return (
      <div className="success" data-screen-label="Submitted">
        <div className="check-badge">{Icon.check(30, 3)}</div>
        <div className="stack" style={{ gap: 8 }}>
          <h1 className="title-xl">Registration submitted</h1>
          <p className="lede">Thank you, {done.fullName.split(' ')[0]}. Your details were sent to the {prov(done.province).name} admissions team for verification.</p>
        </div>
        <div className="card stack" style={{ padding: 18, gap: 6 }}>
          <span className="eyebrow">Registration ID</span>
          <span className="mono" style={{ fontSize: 24, color: 'var(--green)' }}>{done.id}</span>
          <span style={{ fontSize: 13 }} className="muted">{done.program} · {done.city}</span>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={() => { setDone(null); setFormKey(k => k + 1); }}>Submit another response</button>
        {isPreview && <button className="btn ghost" onClick={exitPreview}>Exit preview · back to admin</button>}
      </div>
    );
  }
  return <Form key={formKey} link={link} isPreview={isPreview} onExitPreview={exitPreview} onDone={setDone} />;
}

function Form({ link, isPreview, onExitPreview, onDone }: {
  link: RegistrationLink; isPreview: boolean; onExitPreview: () => void; onDone: (s: Student) => void;
}) {
  const region = prov(link.province);
  const [step, setStep] = useState(0);
  const [f, setF] = useState<RegistrationForm>(EMPTY_FORM);
  const [e, setE] = useState<Errors>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [step]);

  const set = (k: keyof RegistrationForm) => (v: string) => {
    setF(prev => ({ ...prev, [k]: formatField(k, v) }));
    setE(prev => { const n = { ...prev }; delete n[k]; return n; });
  };
  const goStep = (n: number) => { setStep(n); setE({}); };

  async function next() {
    const errs = validateStep(step, f, region.cities, consent);
    if (Object.keys(errs).length) return setE(errs);
    if (step < 3) return goStep(step + 1);
    setSubmitting(true);
    setSubmitError('');
    try {
      onDone(await api.submitRegistration(link.code, f));
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit. Please try again.');
      setSubmitting(false);
    }
  }

  const choice = (value: string, key: keyof RegistrationForm, size: string, children?: React.ReactNode) => (
    <button key={value} type="button" className={cx('opt', size, f[key] === value && 'on')} onClick={() => set(key)(value)}>
      {children ?? value}
    </button>
  );

  const review = [
    { title: 'Personal', step: 0, rows: [['Name', f.fullName], ["Father's name", f.fatherName], ['CNIC / B-Form', f.cnic], ['Date of birth', f.dob], ['Gender', f.gender]] },
    { title: 'Contact & region', step: 1, rows: [['Mobile', f.phone], ['Email', f.email], ['City', f.city], ['Province', region.name], ['Address', f.address]] },
    { title: 'Academic', step: 2, rows: [['Level', f.level], ['Program', f.program], ['Institution', f.institution], ['Last result', f.marks ? f.marks + '%' : '']] },
  ];

  return (
    <div className="screen" data-screen-label="Registration">
      <div className="reg-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="urlbar mono">{Icon.lock}<span>{displayUrl(link.code)}</span></div>
          {isPreview && <button className="pill-dark" onClick={onExitPreview}>Exit preview</button>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 40 }}>
          {step > 0 && <button className="icon-btn" aria-label="Back" onClick={() => goStep(step - 1)}>{Icon.back}</button>}
          <div className="stack">
            <span style={{ fontSize: 12, fontWeight: 600 }} className="muted">{region.name} registration · Step {step + 1} of 4</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>{STEPS[step]}</span>
          </div>
        </div>
        <div className="progress">{[0, 1, 2, 3].map(i => <div key={i} className={cx(i <= step && 'done')} />)}</div>
      </div>

      <div ref={scrollRef} className="scroll reg-body">
        {step === 0 && <>
          <TextField label="Full name" value={f.fullName} onChange={set('fullName')} error={e.fullName} placeholder="As on CNIC / B-Form" />
          <TextField label="Father's name" value={f.fatherName} onChange={set('fatherName')} error={e.fatherName} placeholder="Father / guardian name" />
          <TextField label="CNIC / B-Form number" value={f.cnic} onChange={set('cnic')} error={e.cnic} mono inputMode="numeric" placeholder="35202-1234567-1" />
          <TextField label="Date of birth" type="date" value={f.dob} onChange={set('dob')} error={e.dob} />
          <Group label="Gender" error={e.gender}>
            <div className="grid-2">{GENDERS.map(g => choice(g, 'gender', 'opt-lg'))}</div>
          </Group>
        </>}

        {step === 1 && <>
          <TextField label="Mobile number" value={f.phone} onChange={set('phone')} error={e.phone} mono inputMode="numeric" placeholder="0300-1234567" />
          <TextField label="Email" type="email" value={f.email} onChange={set('email')} error={e.email} placeholder="name@example.com" />
          <Group label="Province / region">
            <div className="locked"><span>{region.name}</span><span style={{ fontSize: 12 }}>Set by your link</span></div>
          </Group>
          <Group label="City" error={e.city}>
            <div className="wrap">{region.cities.map(c => choice(c, 'city', 'opt-pill'))}</div>
          </Group>
          <TextField label="Home address" value={f.address} onChange={set('address')} error={e.address} placeholder="House, street, area" />
        </>}

        {step === 2 && <>
          <Group label="Applying for level" error={e.level}>
            <div className="grid-2">{LEVELS.map(l => choice(l, 'level', 'opt-md'))}</div>
          </Group>
          <Group label="Program category" error={e.program}>
            <div className="stack" style={{ gap: 8 }}>
              {PROGRAMS.map(p => choice(p, 'program', 'opt-row', <><span>{p}</span><span className="radio" /></>))}
            </div>
          </Group>
          <TextField label="Current / last institution" value={f.institution} onChange={set('institution')} error={e.institution} placeholder="School, college or university" />
          <TextField label="Last exam result (%)" value={f.marks} onChange={set('marks')} error={e.marks} inputMode="decimal" placeholder="e.g. 82" />
        </>}

        {step === 3 && <>
          {review.map(sec => (
            <div key={sec.title} className="card card-18 review-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 6px' }}>
                <span className="eyebrow">{sec.title}</span>
                <button className="link-btn" style={{ fontWeight: 700 }} onClick={() => goStep(sec.step)}>Edit</button>
              </div>
              {sec.rows.map(([k, v]) => <div key={k} className="kv"><span>{k}</span><span>{v}</span></div>)}
            </div>
          ))}
          <button className="consent" onClick={() => { setConsent(c => !c); setE({}); }} aria-pressed={consent}>
            <span className={cx('checkbox', consent && 'on', e.consent && 'invalid')}>{Icon.check(13, 3.5)}</span>
            <span style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--ink-2)' }}>I confirm the details above are correct and match my CNIC / B-Form.</span>
          </button>
          {e.consent && <span className="err-text" style={{ marginTop: -8 }}>{e.consent}</span>}
          {submitError && <span className="err-text">{submitError}</span>}
        </>}
      </div>

      <div className="reg-foot">
        <button className="btn" onClick={next} disabled={submitting}>
          {step === 3 ? (submitting ? 'Submitting…' : 'Submit registration') : 'Continue'}
        </button>
      </div>
    </div>
  );
}
