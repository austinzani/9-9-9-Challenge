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
        padding: 'var(--scoreboard-footer-padding)',
        textAlign: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize: 'var(--scoreboard-footer-font-size)',
        letterSpacing: '0.18em',
        color: palette.inkDim,
        borderTop: `1px solid ${palette.line}`,
        background: palette.panelDeep,
      }}
    >
      <div
        style={{
          marginBottom: 'var(--scoreboard-footer-gap)',
        }}
      >
        9·9·9 CHALLENGE — MAY 31, 2026
      </div>
      {showQrUrl && <div style={{ color: palette.gold }}>{qrUrl.toUpperCase()}</div>}
      {showQrCode && (
        <div
          style={{
            marginTop: 'calc(var(--scoreboard-footer-gap) * 2)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 'var(--scoreboard-qr-width)',
            }}
          >
            <QRCodeSVG
              value={qrUrl.startsWith('http') ? qrUrl : `https://${qrUrl}`}
              size={120}
              bgColor="#ffffff"
              fgColor="#173527"
              level="M"
              includeMargin
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
