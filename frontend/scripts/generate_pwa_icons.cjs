const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

function renderIconHtml(size, isMaskable = false) {
  // For maskable icon, keep the central artwork within 70% of the canvas to satisfy Android safe zone
  const scale = isMaskable ? 0.72 : 0.82;
  const logoSize = Math.round(size * scale);
  const borderRadius = Math.round(logoSize * 0.25);
  const innerRadius = Math.round(borderRadius - (size >= 192 ? 8 : 4));
  const borderWidth = size >= 512 ? 14 : (size >= 192 ? 6 : 3);
  const compassSize = Math.round(logoSize * 0.54);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${size}px;
      height: ${size}px;
      background: #020617;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }
    .squircle-border {
      width: ${logoSize}px;
      height: ${logoSize}px;
      border-radius: ${borderRadius}px;
      background: linear-gradient(135deg, #4f46e5 0%, #2563eb 50%, #22d3ee 100%);
      padding: ${borderWidth}px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${Math.round(size * 0.04)}px ${Math.round(size * 0.08)}px rgba(79, 70, 229, 0.35);
    }
    .squircle-inner {
      width: 100%;
      height: 100%;
      background: #020617;
      border-radius: ${innerRadius}px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  </style>
</head>
<body>
  <div class="squircle-border">
    <div class="squircle-inner">
      <svg xmlns="http://www.w3.org/2000/svg" width="${compassSize}" height="${compassSize}" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" stroke="#22d3ee" stroke-width="2.1"/>
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="url(#comp-grad)" stroke="#22d3ee" stroke-width="1"/>
        <defs>
          <linearGradient id="comp-grad" x1="7.76" y1="7.76" x2="16.24" y2="16.24" gradientUnits="userSpaceOnUse">
            <stop stop-color="#22d3ee"/>
            <stop offset="50%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#4f46e5"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
</body>
</html>`;
}

const targets = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
  { file: 'favicon-32x32.png', size: 32, maskable: false },
  { file: 'favicon-16x16.png', size: 16, maskable: false },
];

console.log('Generating PWA icons using Chrome headless...');

for (const target of targets) {
  const htmlContent = renderIconHtml(target.size, target.maskable);
  const tempHtmlPath = path.join(PUBLIC_DIR, `_temp_${target.size}.html`);
  const outPath = path.join(PUBLIC_DIR, target.file);

  fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');

  try {
    execFileSync(CHROME_PATH, [
      '--headless=new',
      '--disable-gpu',
      `--window-size=${target.size},${target.size}`,
      `--screenshot=${outPath}`,
      '--hide-scrollbars',
      `file:///${tempHtmlPath.replace(/\\/g, '/')}`
    ]);
    console.log(`Generated: ${target.file} (${target.size}x${target.size})`);
  } catch (err) {
    console.error(`Error generating ${target.file}:`, err);
  } finally {
    if (fs.existsSync(tempHtmlPath)) {
      fs.unlinkSync(tempHtmlPath);
    }
  }
}

console.log('All PWA icons generated successfully!');
