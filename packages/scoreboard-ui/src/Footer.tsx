import { QRCodeSVG } from 'qrcode.react';

import type { Palette } from './palettes';

interface FooterProps {
  palette: Palette;
  qrUrl?: string;
  showQrUrl?: boolean;
  showQrCode?: boolean;
}

/** Footer with event stamp and public URL for remote viewers. */
export function Footer({
  palette,
  qrUrl = '999.austinzani.dev',
  showQrUrl = true,
  showQrCode = false,
}: FooterProps) {
  return (
    <div
      style={{
        padding: 'clamp(16px, 1.8cqi, 54px) clamp(16px, 1.8cqi, 48px) clamp(28px, 2.8cqi, 80px)',
        textAlign: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize: 'clamp(10px, 1.05cqi, 30px)',
        letterSpacing: '0.18em',
        color: palette.inkDim,
        borderTop: `1px solid ${palette.line}`,
        background: palette.panelDeep,
      }}
    >
      <div style={{ marginBottom: 'clamp(4px, 0.5cqi, 14px)' }}>9·9·9 CHALLENGE — MAY 31, 2026</div>
      {showQrUrl && <div style={{ color: palette.gold }}>{qrUrl.toUpperCase()}</div>}
      {showQrCode && (
        <div
          style={{
            marginTop: 'clamp(8px, 1cqi, 24px)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG
            value={qrUrl.startsWith('http') ? qrUrl : `https://${qrUrl}`}
            size={120}
            bgColor="#ffffff"
            fgColor="#173527"
            level="M"
            includeMargin
          />
        </div>
      )}
    </div>
  );
}
