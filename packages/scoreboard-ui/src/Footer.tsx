import { QRCodeSVG } from 'qrcode.react';

import type { Palette } from './palettes';

interface FooterProps {
  palette: Palette;
  /** Public scoreboard URL for remote viewers. The URL line and QR code are hidden when omitted. */
  qrUrl?: string;
  /** Text on the footer's top line, e.g. "9·9·9 CHALLENGE — JULY 4, 2026". */
  eventLabel?: string;
  showQrUrl?: boolean;
  showQrCode?: boolean;
}

/** Footer with event stamp and public URL for remote viewers. */
export function Footer({
  palette,
  qrUrl,
  eventLabel = '9·9·9 CHALLENGE',
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
        {eventLabel}
      </div>
      {showQrUrl && qrUrl && (
        <div style={{ color: palette.gold }}>
          {qrUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').toUpperCase()}
        </div>
      )}
      {showQrCode && qrUrl && (
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
