import { ImageResponse } from 'next/og';

export const alt = 'GarageCherries — Classic & Collector Cars For Sale';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #18181b 0%, #27272a 55%, #450a0a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Red accent bar at top */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: '#dc2626' }} />

        {/* Logo mark */}
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ color: 'white', fontSize: 48, fontWeight: 900, lineHeight: 1 }}>GC</div>
        </div>

        {/* Wordmark */}
        <div
          style={{
            fontSize: 68,
            fontWeight: 900,
            color: 'white',
            letterSpacing: '-2px',
            lineHeight: 1,
            marginBottom: 20,
          }}
        >
          GarageCherries
        </div>

        {/* Tagline */}
        <div style={{ fontSize: 28, color: '#fca5a5', fontWeight: 400, letterSpacing: '0.5px' }}>
          Classic &amp; Collector Cars For Sale
        </div>

        {/* Domain pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(255,255,255,0.08)',
            borderRadius: 999,
            padding: '10px 24px',
            color: '#a1a1aa',
            fontSize: 22,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
          garagecherries.com
        </div>
      </div>
    ),
    { ...size },
  );
}
