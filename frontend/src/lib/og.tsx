import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const clamp = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * The 1200×630 card shown when a ResearchReel link is shared (Open Graph /
 * Twitter). One layout for every page type so shared links look consistent.
 */
export function shareCard({
  kicker,
  title,
  subtitle,
  footer,
  verified = false,
  accent = '#6366f1',
}: {
  kicker: string;
  title: string;
  subtitle?: string | null;
  footer?: string | null;
  verified?: boolean;
  accent?: string;
}) {
  const t = clamp(title, 140);
  const titleSize = t.length > 90 ? 52 : t.length > 50 ? 62 : 74;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '64px 72px', background: 'linear-gradient(135deg, #0b0b14 0%, #151530 55%, #1e1b4b 100%)', color: '#fff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>R</div>
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>ResearchReel</div>
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: '#c7d2fe', background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(165,180,252,0.35)', padding: '8px 20px', borderRadius: 999 }}>
            {clamp(kicker, 48)}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.08, letterSpacing: -1.5 }}>{t}</div>
          {subtitle && <div style={{ fontSize: 30, color: '#a5b4fc', lineHeight: 1.3 }}>{clamp(subtitle, 120)}</div>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, color: '#d4d4d8' }}>
          {footer && <div style={{ display: 'flex' }}>{clamp(footer, 80)}</div>}
          {verified && (
            <div style={{ display: 'flex', fontSize: 22, color: '#34d399', border: '1px solid rgba(52,211,153,0.5)', padding: '4px 14px', borderRadius: 999 }}>Verified</div>
          )}
        </div>
      </div>
    ),
    OG_SIZE
  );
}

export const VERIFIED_STATUSES = ['student', 'scholar', 'faculty'];

export const displayNameOf = (p: { full_name?: string | null; username: string }) => p.full_name?.trim() || `@${p.username}`;
