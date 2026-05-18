import type { Palette } from './palettes';

interface FooterProps {
  palette: Palette;
  qrUrl?: string;
}

/** Footer with event stamp and public URL for remote viewers. */
export function Footer({ palette, qrUrl = '999.austinzani.dev' }: FooterProps) {
  return (
    <div
      style={{
        padding: '16px 16px 28px',
        textAlign: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize: 10,
        letterSpacing: '0.18em',
        color: palette.inkDim,
        borderTop: `1px solid ${palette.line}`,
        background: palette.panelDeep,
      }}
    >
      <div style={{ marginBottom: 4 }}>9·9·9 CHALLENGE — MAY 31, 2026</div>
      <div style={{ color: palette.gold }}>{qrUrl.toUpperCase()}</div>
    </div>
  );
}
