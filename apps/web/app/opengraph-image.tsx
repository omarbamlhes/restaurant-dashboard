import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'رستق | منصة إدارة المطاعم الذكية';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Fetch a satori-compatible (ttf/otf/woff — NOT woff2) Arabic font from Google
// Fonts. An older User-Agent makes Google serve a non-woff2 format. Returns null
// on any failure so the image still renders with the built-in Latin fallback.
async function loadArabicFont(weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@${weight}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.1 Safari/534.30' } },
    ).then((r) => r.text());
    const url = css.match(/src:\s*url\((https:[^)]+\.(?:ttf|otf|woff))\)/)?.[1];
    if (!url) return null;
    return await fetch(url).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

export default async function OpengraphImage() {
  const [bold, regular] = await Promise.all([loadArabicFont(700), loadArabicFont(400)]);
  const hasArabic = !!bold;
  const font = 'IBM Plex Sans Arabic';

  const fonts = [
    ...(bold ? [{ name: font, data: bold, weight: 700 as const, style: 'normal' as const }] : []),
    ...(regular ? [{ name: font, data: regular, weight: 400 as const, style: 'normal' as const }] : []),
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f3a2c 0%, #1e5740 55%, #2d8a5e 100%)',
          fontFamily: hasArabic ? font : 'sans-serif',
          direction: 'rtl',
          position: 'relative',
        }}
      >
        {/* Bar-chart motif */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 14, opacity: 0.16, padding: 40 }}>
          {[120, 200, 150, 260, 180, 300, 220, 280, 190, 320].map((h, i) => (
            <div key={i} style={{ width: 46, height: h, background: '#e8c352', borderRadius: 8 }} />
          ))}
        </div>

        {/* Logo mark */}
        <div style={{ display: 'flex', width: 108, height: 108, borderRadius: 28, background: '#e8c352', alignItems: 'center', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 }}>
            <div style={{ width: 12, height: 26, background: '#1e5740', borderRadius: 3 }} />
            <div style={{ width: 12, height: 44, background: '#1e5740', borderRadius: 3 }} />
            <div style={{ width: 12, height: 60, background: '#0f3a2c', borderRadius: 3 }} />
            <div style={{ width: 12, height: 40, background: '#1e5740', borderRadius: 3 }} />
          </div>
        </div>

        <div style={{ fontSize: 92, fontWeight: 700, color: '#ffffff', marginBottom: 16 }}>
          {hasArabic ? 'رستق' : 'Rustaq'}
        </div>
        <div style={{ fontSize: 40, color: 'rgba(255,255,255,0.92)', fontWeight: 700 }}>
          {hasArabic ? 'منصة إدارة المطاعم الذكية' : 'Smart Restaurant Management'}
        </div>
        <div style={{ fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 20 }}>
          {hasArabic ? 'تحليلات • مخزون • موظفين • فروع' : 'Analytics · Inventory · Staff · Branches'}
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
