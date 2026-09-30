import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import QRCode from 'qrcode';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

export function TextField({ label, value, onChange, error, mono, type, inputMode, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; error?: string; mono?: boolean;
  type?: string; inputMode?: 'numeric' | 'decimal' | 'email'; placeholder?: string;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={cx('input', mono && 'mono', error && 'invalid')} value={value} type={type} inputMode={inputMode}
        placeholder={placeholder} onChange={e => onChange(e.target.value)} />
      {error && <span className="err-text">{error}</span>}
    </label>
  );
}

export function Group({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="err-text">{error}</span>}
    </div>
  );
}

export function Sheet({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="sheet-wrap" role="dialog" aria-modal="true">
      <div className="scrim" onClick={onClose} />
      {children}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState('');
  const t = useRef<number | undefined>(undefined);
  const flash = useCallback((m: string) => {
    clearTimeout(t.current);
    setMsg(m);
    t.current = window.setTimeout(() => setMsg(''), 1600);
  }, []);
  useEffect(() => () => clearTimeout(t.current), []);
  const node = msg ? <div className="toast" role="status">{msg}</div> : null;
  return { flash, node };
}

/** A scannable QR code rendered as crisp SVG modules. */
export function QrCode({ text }: { text: string }) {
  const { size, path } = useMemo(() => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
    let d = '';
    for (let y = 0; y < modules.size; y++)
      for (let x = 0; x < modules.size; x++)
        if (modules.get(x, y)) d += `M${x} ${y}h1v1h-1z`;
    return { size: modules.size, path: d };
  }, [text]);
  return (
    <svg className="qr" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <path d={path} fill="#14231C" />
    </svg>
  );
}

export async function downloadQrPng(text: string, filename: string) {
  const url = await QRCode.toDataURL(text, { width: 1024, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#14231C', light: '#FFFFFF' } });
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export const Icon = {
  lock: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  check: (size: number, w: number) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>,
  search: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
};
