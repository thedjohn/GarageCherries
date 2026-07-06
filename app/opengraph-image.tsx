import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'GarageCherries — Classic, Muscle, Sport & Collector Cars';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
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
          padding: '60px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '28px' }}>
          <div style={{
            width: '72px', height: '72px', background: '#dc2626',
            borderRadius: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '38px',
          }}>
            🍒
          </div>
          <span style={{ fontSize: '56px', fontWeight: 800, color: '#ffffff', letterSpacing: '-2px' }}>
            GarageCherries
          </span>
        </div>
        <p style={{
          fontSize: '26px', color: '#a1a1aa', textAlign: 'center',
          margin: '0 0 44px', maxWidth: '680px', lineHeight: 1.4,
        }}>
          Classic, Muscle, Sport & Collector Cars For Sale
        </p>
        <div style={{ display: 'flex', gap: '14px' }}>
          {['Classic Cars', 'Muscle Cars', 'Sports Cars', 'Collector Cars'].map(tag => (
            <div key={tag} style={{
              background: '#dc2626', color: '#ffffff',
              padding: '10px 22px', borderRadius: '100px',
              fontSize: '17px', fontWeight: 700,
            }}>
              {tag}
            </div>
          ))}
        </div>
        <p style={{ fontSize: '18px', color: '#52525b', marginTop: '48px', letterSpacing: '1px' }}>
          garagecherries.com
        </p>
      </div>
    ),
    { ...size },
  );
}
