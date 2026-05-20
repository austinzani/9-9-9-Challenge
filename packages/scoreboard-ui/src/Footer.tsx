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
        padding:
          'clamp(16px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(54px * var(--scoreboard-scale, 1))) clamp(16px, calc(1.8cqi * var(--scoreboard-scale, 1)), calc(48px * var(--scoreboard-scale, 1))) clamp(28px, calc(2.8cqi * var(--scoreboard-scale, 1)), calc(80px * var(--scoreboard-scale, 1)))',
        textAlign: 'center',
        fontFamily: '"DM Mono", monospace',
        fontSize:
          'clamp(10px, calc(1.05cqi * var(--scoreboard-scale, 1)), calc(30px * var(--scoreboard-scale, 1)))',
        letterSpacing: '0.18em',
        color: palette.inkDim,
        borderTop: `1px solid ${palette.line}`,
        background: palette.panelDeep,
      }}
    >
      <div
        style={{
          marginBottom:
            'clamp(4px, calc(0.5cqi * var(--scoreboard-scale, 1)), calc(14px * var(--scoreboard-scale, 1)))',
        }}
      >
        9·9·9 CHALLENGE — MAY 31, 2026
      </div>
      {showQrUrl && <div style={{ color: palette.gold }}>{qrUrl.toUpperCase()}</div>}
      {showQrCode && (
        <div
          style={{
            marginTop:
              'clamp(8px, calc(1cqi * var(--scoreboard-scale, 1)), calc(24px * var(--scoreboard-scale, 1)))',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width:
                'clamp(120px, calc(10cqi * var(--scoreboard-scale, 1)), calc(280px * var(--scoreboard-scale, 1)))',
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
