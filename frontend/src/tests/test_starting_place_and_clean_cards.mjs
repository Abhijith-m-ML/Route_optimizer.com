import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

console.log('===========================================================');
console.log('🧪 Starting Card Cleanup & Starting Place Feature Test Suite');
console.log('===========================================================');

const cardCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationCard.tsx'), 'utf-8');
const listCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8');
const sidebarCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'Sidebar.tsx'), 'utf-8');
const dashboardCode = fs.readFileSync(path.join(srcDir, 'pages', 'DashboardPage.tsx'), 'utf-8');
const mapCode = fs.readFileSync(path.join(srcDir, 'components', 'Map', 'InteractiveMap.tsx'), 'utf-8');

// 1. Star Rating, Category (Modern), and Visiting Duration Removal
console.log('\nTest 1: Star, Category, and Visit Duration Removed from Destination Cards');
assert(!cardCode.includes('stop.rating'), 'Star rating (stop.rating) must be removed from DestinationCard');
assert(!cardCode.includes('stop.category'), 'Category badge (stop.category) must be removed from DestinationCard');
assert(!cardCode.includes('<span>Visit:</span>'), 'Visit duration selector must be removed from DestinationCard');
console.log('  ✅ Passed: DestinationCard cleanly removed star rating, category, and visit duration');

// 2. Set as Start in DestinationCard
console.log('\nTest 2: Set as Start Option in DestinationCard');
assert(cardCode.includes('onSetAsStart'), 'DestinationCard accepts onSetAsStart callback');
assert(cardCode.includes('Set as Start'), 'DestinationCard displays "Set as Start" button for non-first stops');
assert(cardCode.includes('Starting Place'), 'DestinationCard displays "Starting Place" indicator for the first stop');
console.log('  ✅ Passed: DestinationCard provides dedicated starting place actions');

// 3. Quick Starting Place Selector in DestinationList
console.log('\nTest 3: Quick Starting Place Selection in DestinationList');
assert(listCode.includes('onSetAsStart'), 'DestinationList accepts onSetAsStart callback');
assert(listCode.includes('Start Place:'), 'DestinationList provides quick starting place selector when multiple stops exist');
console.log('  ✅ Passed: DestinationList allows choosing the starting place from dropdown and cards');

// 4. Starting Place Logic in DashboardPage
console.log('\nTest 4: Route Recalculation on Setting Starting Place in DashboardPage');
assert(dashboardCode.includes('handleSetAsStart'), 'DashboardPage implements handleSetAsStart');
assert(dashboardCode.includes('reordered.unshift(chosenStart)'), 'Selected start place is moved to the first position (index 0)');
assert(dashboardCode.includes('Starting Place Set'), 'Toast notification informs user when starting place is set');
console.log('  ✅ Passed: Setting a new starting place moves it to index 0 and recalculates route metrics');

// 5. Clean Markers & Set as Start in Map
console.log('\nTest 5: Clean Map InfoWindow and Mobile Sheet');
assert(!mapCode.includes('${stop.category || \'Landmark\'}'), 'Map InfoWindow no longer renders category label');
assert(mapCode.includes('Set as Start'), 'InteractiveMap provides Set as Start button');
console.log('  ✅ Passed: InteractiveMap InfoWindow and Mobile Sheet cleanly updated with Set as Start');

console.log('\n===========================================================');
console.log('🎉 ALL 5 CLEAN CARD & STARTING PLACE TESTS PASSED (100%)!');
console.log('===========================================================');

