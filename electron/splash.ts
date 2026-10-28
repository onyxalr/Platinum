/**
 * Native launch splash. It lives in its own always-on-top frameless window so
 * Platinum's mark appears above the desktop and any other application while the
 * local server, database and renderer warm up. The window is intentionally
 * self-contained: no images, fonts or network requests, so it paints instantly.
 */
function logoMark(): string {
  return `
  <svg class="logo" viewBox="0 0 64 64" width="88" height="88" aria-hidden="true">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#18161f"/>
        <stop offset="0.52" stop-color="#0b0b0d"/>
        <stop offset="1" stop-color="#050506"/>
      </linearGradient>
      <radialGradient id="light" cx="46%" cy="24%" r="68%">
        <stop offset="0" stop-color="#c9b8ff" stop-opacity="0.3"/>
        <stop offset="0.52" stop-color="#c9b8ff" stop-opacity="0.07"/>
        <stop offset="1" stop-color="#070708" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="p" gradientUnits="userSpaceOnUse" x1="22" y1="16" x2="45" y2="48">
        <stop offset="0" stop-color="#fffdf8"/>
        <stop offset="0.56" stop-color="#f4f2ee"/>
        <stop offset="1" stop-color="#c9b8ff"/>
      </linearGradient>
      <linearGradient id="orbit" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fffdf8" stop-opacity="0.42"/>
        <stop offset="0.52" stop-color="#c9b8ff" stop-opacity="0.52"/>
        <stop offset="1" stop-color="#c9b8ff" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    <rect width="64" height="64" rx="19" fill="url(#bg)"/>
    <rect width="64" height="64" rx="19" fill="url(#light)"/>
    <circle cx="32" cy="32" r="21.4" fill="none" stroke="url(#orbit)" stroke-width="0.85"/>
    <circle cx="47.2" cy="20.4" r="1.15" fill="#c9b8ff"/>
    <circle cx="47.2" cy="20.4" r="3" fill="#c9b8ff" opacity="0.2"/>
    <path d="M24.5 47.5V16.5h10.2c7.9 0 13 4.1 13 9.9s-5.1 10-13 10h-10.2" fill="none" stroke="url(#p)" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="1.4" y="1.4" width="61.2" height="61.2" rx="17.8" fill="none" stroke="#fffdf8" stroke-opacity="0.11" stroke-width="0.8"/>
  </svg>`;
}

function splashHtml(): string {
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="color-scheme" content="dark" />
<style>
  html, body { margin: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
  body { display: flex; align-items: center; justify-content: center; -webkit-user-select: none; user-select: none; }
  .splash {
    position: relative;
    width: calc(100% - 24px);
    height: calc(100% - 24px);
    border-radius: 30px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background:
      radial-gradient(54% 48% at 50% 34%, rgba(201, 184, 255, 0.16), transparent 72%),
      radial-gradient(70% 62% at 78% 112%, rgba(184, 216, 243, 0.07), transparent 70%),
      linear-gradient(168deg, #131218 0%, #0b0b0d 52%, #060607 100%);
    box-shadow: 0 32px 90px rgba(0, 0, 0, 0.62), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 17px;
    overflow: hidden;
  }
  .splash::after {
    content: '';
    position: absolute;
    inset: 0;
    opacity: 0.035;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 220 220' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  }
  .logo {
    animation: rise 900ms cubic-bezier(0.13, 0.72, 0.19, 1) both, breathe 3.4s ease-in-out 900ms infinite;
    filter: drop-shadow(0 16px 30px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 30px rgba(201, 184, 255, 0.17));
    will-change: transform, opacity;
  }
  .word {
    margin-top: 2px;
    color: #f4f2ee;
    font-family: 'Unbounded', 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.44em;
    padding-left: 0.44em;
    line-height: 1;
    animation: rise 700ms cubic-bezier(0.13, 0.72, 0.19, 1) 130ms both;
  }
  .line {
    width: 52px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(244, 242, 238, 0.62), transparent);
    animation: pulse 1.9s ease-in-out 400ms infinite;
  }
  .note {
    color: rgba(244, 242, 238, 0.36);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    font-size: 7.5px;
    font-weight: 600;
    letter-spacing: 0.34em;
    padding-left: 0.34em;
    margin-top: -6px;
    animation: rise 700ms cubic-bezier(0.13, 0.72, 0.19, 1) 220ms both;
  }
  @keyframes rise {
    from { opacity: 0; transform: translateY(9px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes breathe {
    0%, 100% { opacity: 0.9; transform: translateY(0) scale(0.988); }
    50% { opacity: 1; transform: translateY(-2px) scale(1); }
  }
  @keyframes pulse {
    0%, 100% { opacity: 0.18; transform: scaleX(0.62); }
    50% { opacity: 1; transform: scaleX(1); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 1ms !important; animation-iteration-count: 1 !important; }
  }
</style>
</head>
<body>
  <div class="splash">
    ${logoMark()}
    <div class="word">PLATINUM</div>
    <div class="line"></div>
    <div class="note">LOCAL MUSIC SYSTEM</div>
  </div>
</body>
</html>`;
}

export const SPLASH_URL = `data:text/html;charset=UTF-8,${encodeURIComponent(splashHtml())}`;
