import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const frontendDist = path.resolve(projectRoot, 'frontend/dist');
const frontendPublic = path.resolve(projectRoot, 'frontend/public');
const frontendIndexHtml = path.resolve(projectRoot, 'frontend/index.html');

console.log('====================================================');
console.log('🧪 RUNNING VAZHIKATTI PWA INSTALLABILITY AUDIT SUITE');
console.log('====================================================');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. Verify Web App Manifest
console.log('\n[1] Auditing Web App Manifest (manifest.webmanifest)...');
const manifestPath = path.join(frontendPublic, 'manifest.webmanifest');
assert(fs.existsSync(manifestPath), 'manifest.webmanifest exists in frontend/public');

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert(true, 'manifest.webmanifest is valid JSON');
} catch (e) {
  assert(false, `manifest.webmanifest failed to parse: ${e.message}`);
}

if (manifest) {
  assert(manifest.name === 'Vazhikatti', `Manifest name is "Vazhikatti" (actual: ${manifest.name})`);
  assert(manifest.short_name === 'Vazhikatti', `Manifest short_name is "Vazhikatti" (actual: ${manifest.short_name})`);
  assert(manifest.display === 'standalone', `Display mode is "standalone" (actual: ${manifest.display})`);
  assert(manifest.start_url === '/dashboard', `Start URL is "/dashboard" (actual: ${manifest.start_url})`);
  assert(manifest.scope === '/', `Scope is "/" (actual: ${manifest.scope})`);
  assert(manifest.theme_color === '#020617', `Theme color matches brand dark (#020617)`);
  assert(manifest.background_color === '#020617', `Background color matches splash screen (#020617)`);
  
  // Verify icons
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest defines at least 2 icons');
  const has192 = manifest.icons.some(i => i.sizes === '192x192' && i.src.includes('192'));
  const has512 = manifest.icons.some(i => i.sizes === '512x512' && i.src.includes('512'));
  const hasMaskable = manifest.icons.some(i => i.purpose?.includes('maskable'));
  assert(has192, 'Manifest contains 192x192 icon');
  assert(has512, 'Manifest contains 512x512 icon');
  assert(hasMaskable, 'Manifest contains maskable icon');
}

// 2. Verify Generated Brand Icons on Disk
console.log('\n[2] Auditing PWA Brand Icons on Disk...');
const expectedIcons = [
  'pwa-192x192.png',
  'pwa-512x512.png',
  'maskable-icon-512x512.png',
  'apple-touch-icon.png',
  'favicon-32x32.png',
  'favicon-16x16.png'
];

for (const icon of expectedIcons) {
  const iconPath = path.join(frontendPublic, icon);
  const exists = fs.existsSync(iconPath);
  const size = exists ? fs.statSync(iconPath).size : 0;
  assert(exists && size > 100, `Icon "${icon}" exists and is valid (${size} bytes)`);
}

// 3. Verify HTML Meta Tags in index.html
console.log('\n[3] Auditing HTML Meta & Link Tags in index.html...');
const htmlContent = fs.readFileSync(frontendIndexHtml, 'utf8');
assert(htmlContent.includes('rel="manifest"'), 'index.html contains <link rel="manifest">');
assert(htmlContent.includes('rel="apple-touch-icon"'), 'index.html contains <link rel="apple-touch-icon">');
assert(htmlContent.includes('name="theme-color"'), 'index.html contains <meta name="theme-color">');
assert(htmlContent.includes('name="apple-mobile-web-app-capable"'), 'index.html contains <meta name="apple-mobile-web-app-capable">');
assert(htmlContent.includes('viewport-fit=cover'), 'index.html contains viewport-fit=cover for iOS safe areas');

// 4. Verify Service Worker Implementation
console.log('\n[4] Auditing Service Worker (sw.js)...');
const swPath = path.join(frontendPublic, 'sw.js');
assert(fs.existsSync(swPath), 'sw.js exists in frontend/public');

const swContent = fs.readFileSync(swPath, 'utf8');
assert(swContent.includes('CACHE_VERSION') || swContent.includes('STATIC_CACHE'), 'sw.js specifies CACHE_VERSION/STATIC_CACHE');
assert(swContent.includes('PRECACHE_MANIFEST') || swContent.includes('PRECACHE_ASSETS'), 'sw.js specifies PRECACHE_MANIFEST');
assert(swContent.includes('/manifest.webmanifest'), 'sw.js precaches manifest');
assert(swContent.includes('SKIP_WAITING'), 'sw.js handles SKIP_WAITING message');
assert(swContent.includes('/api/'), 'sw.js contains bypass rule for /api/ backend endpoints');
assert(swContent.includes('request.mode === \'navigate\''), 'sw.js contains navigation route handler with app shell fallback');

// 5. Verify Frontend Dist Assets for Production
console.log('\n[5] Auditing Built Production Artifacts (frontend/dist)...');
assert(fs.existsSync(path.join(frontendDist, 'sw.js')), 'dist/sw.js exists');
assert(fs.existsSync(path.join(frontendDist, 'manifest.webmanifest')), 'dist/manifest.webmanifest exists');
assert(fs.existsSync(path.join(frontendDist, 'pwa-192x192.png')), 'dist/pwa-192x192.png exists');
assert(fs.existsSync(path.join(frontendDist, 'pwa-512x512.png')), 'dist/pwa-512x512.png exists');
assert(fs.existsSync(path.join(frontendDist, 'apple-touch-icon.png')), 'dist/apple-touch-icon.png exists');

// Summary
console.log('\n====================================================');
console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('====================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 All PWA Installability requirements verified successfully!\n');
}
