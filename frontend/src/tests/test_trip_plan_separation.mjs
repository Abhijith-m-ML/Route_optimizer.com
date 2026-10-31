import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

console.log('===========================================================');
console.log('🧪 Starting Vazhikatti Mobile Separation & Trip Plan Tests');
console.log('===========================================================');

let failures = 0;
function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failures++;
  } else {
    console.log(`  ✅ Passed: ${message}`);
  }
}

// 1. Interactive Map — Clean Navigation Experience
console.log('\nTest 1: Interactive Map Screen Space & Clean View');
const dashboardCode = fs.readFileSync(path.join(srcDir, 'pages', 'DashboardPage.tsx'), 'utf-8');
const mapCode = fs.readFileSync(path.join(srcDir, 'components', 'Map', 'InteractiveMap.tsx'), 'utf-8');
const bottomSheetCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'MobileBottomSheet.tsx'), 'utf-8');

assert(
  dashboardCode.includes("mobileView === 'map' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'"),
  'Interactive Map occupies 100% of mobile viewport height when active'
);
assert(
  !bottomSheetCode.includes('<SearchBox') && !bottomSheetCode.includes('<DestinationList'),
  'Interactive Map completely removes duplicate SearchBox and DestinationList from the bottom'
);
assert(
  mapCode.includes('HUD Info Pill') || mapCode.includes('Selected Stops'),
  'Interactive Map preserves selected stop count indicator (HUD pill)'
);
assert(
  mapCode.includes('handleZoomIn') && mapCode.includes('handleRecenter'),
  'Interactive Map preserves map zoom and location controls'
);

// 2. Compact Route Summary Bar
console.log('\nTest 2: Compact Route Summary Bar (MobileBottomSheet.tsx)');
assert(
  bottomSheetCode.includes('stops.length') && bottomSheetCode.includes('Stops'),
  'Summary displays number of selected stops'
);
assert(
  bottomSheetCode.includes('metrics.totalDistanceKm') && bottomSheetCode.includes('metrics.totalDurationMinutes'),
  'Summary displays total route distance and estimated travel duration'
);
assert(
  bottomSheetCode.includes('onOptimizeRoute') && bottomSheetCode.includes('Optimize'),
  'Summary provides 1-tap route optimization'
);
assert(
  bottomSheetCode.includes('View Trip Plan') && bottomSheetCode.includes('onOpenTripPlan'),
  'Summary provides direct navigation action to open Trip Plan tab'
);
assert(
  bottomSheetCode.includes('isCollapsed') && (bottomSheetCode.includes('ChevronUp') || bottomSheetCode.includes('ChevronDown')),
  'Summary supports collapse/expand to avoid covering map controls'
);

// 3. Trip Plan — Complete Destination Management in One Place
console.log('\nTest 3: Trip Plan Dedicated Destination Management (Sidebar.tsx)');
const sidebarCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'Sidebar.tsx'), 'utf-8');

assert(
  sidebarCode.includes('<SearchBox') && sidebarCode.includes('Find & Add Destinations'),
  '1. Trip Plan includes Search and add destinations'
);
assert(
  sidebarCode.includes('selectedState') && sidebarCode.includes('selectedState='),
  '2. Trip Plan includes state selector and state-aware search'
);
assert(
  sidebarCode.includes('<DestinationList') && fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8').includes('Saved Destinations'),
  '3. Trip Plan includes saved destinations management'
);
assert(
  sidebarCode.includes('DestinationList') && (
    fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8').includes('stateGroups') ||
    fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8').includes('trips')
  ),
  '4. Trip Plan includes destination organization & grouping'
);
assert(
  fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8').includes('<DestinationCard'),
  '5. Trip Plan displays destination cards'
);
assert(
  sidebarCode.includes('onMoveUp') && sidebarCode.includes('onMoveDown'),
  '6. Trip Plan provides destination reordering controls'
);
assert(
  sidebarCode.includes('onUpdateDuration'),
  '7. Trip Plan provides visit duration controls'
);
assert(
  sidebarCode.includes('onRemoveStop'),
  '8. Trip Plan provides remove destination actions'
);
assert(
  sidebarCode.includes('onClearAll'),
  '9. Trip Plan provides clear/reset route functionality'
);
assert(
  sidebarCode.includes('Route Distance & Time') && sidebarCode.includes('totalDistanceKm'),
  '10. Trip Plan displays route distance and estimated travel time'
);
assert(
  dashboardCode.includes('<ShareDialog') || fs.readFileSync(path.join(srcDir, 'components', 'Navbar.tsx'), 'utf-8').includes('handleOpenShare'),
  '11. Sharing dialog controls available for destination lists'
);
assert(
  sidebarCode.includes('onSwitchToMap') && sidebarCode.includes('View Route on Interactive Map'),
  '12. Trip Plan provides mobile action to view route on map'
);

// 4. Tab Navigation Synchronization & State Preservation
console.log('\nTest 4: Tab Navigation & State Preservation');
assert(
  dashboardCode.includes("role=\"tab\"") || dashboardCode.includes('Interactive Map') && dashboardCode.includes('Trip Plan'),
  'Segmented mobile navigation tabs clearly present Interactive Map and Trip Plan'
);
assert(
  dashboardCode.includes('Trip Plan ({stops.length})'),
  'Trip Plan tab dynamically reflects updated selected destination count'
);
assert(
  dashboardCode.includes("setMobileView('sidebar')"),
  'Trip Plan tab switching smoothly transitions to Trip Plan view'
);
assert(
  dashboardCode.includes('setMobileView(\'map\')'),
  'Tapping Interactive Map smoothly transitions back to Map'
);
assert(
  dashboardCode.includes('w-full lg:w-[35%]') && dashboardCode.includes('w-full lg:w-[65%]'),
  'Desktop layout preserves 35%/65% split between Trip Plan and Map'
);

console.log('===========================================================');
if (failures === 0) {
  console.log('🎉 ALL VAZHIKATTI MOBILE SEPARATION & TRIP PLAN TESTS PASSED (100%)!');
  console.log('===========================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} test(s) failed.`);
  process.exit(1);
}
