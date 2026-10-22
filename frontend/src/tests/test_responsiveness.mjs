import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');

console.log('===========================================================');
console.log('🧪 Starting RouteWise Responsive Layout & Design Tests');
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

// 1. Verify Navbar.tsx responsiveness
console.log('\nTest 1: Navbar.tsx Mobile & Tablet Responsiveness');
const navbarCode = fs.readFileSync(path.join(srcDir, 'components', 'Navbar.tsx'), 'utf-8');

assert(
  navbarCode.includes('px-2.5 sm:px-4 md:px-6'),
  'Header has responsive horizontal padding across mobile/tablet/desktop'
);
assert(
  navbarCode.includes('hidden md:block') && navbarCode.includes('Editable Trip Title'),
  'Editable trip title in top navbar is hidden on mobile (<md) to avoid squeezing buttons'
);
assert(
  navbarCode.includes('flex-shrink-0') && navbarCode.includes('RouteWise'),
  'Brand logo and RouteWise name have flex-shrink-0 to prevent text squishing'
);
assert(
  navbarCode.includes('<span className="hidden sm:inline">Save Trip</span>') &&
  navbarCode.includes('<span className="sm:hidden font-medium">Save</span>'),
  'Save button has responsive text (Save on mobile, Save Trip on sm+)'
);

// 2. Verify InteractiveMap.tsx responsiveness
console.log('\nTest 2: InteractiveMap.tsx Full-Height & Dynamic Resize');
const mapCode = fs.readFileSync(path.join(srcDir, 'components', 'Map', 'InteractiveMap.tsx'), 'utf-8');

assert(
  !mapCode.includes('min-h-[500px]'),
  'Removed restrictive min-h-[500px] that caused black void beneath map on mobile viewports'
);
assert(
  mapCode.includes('min-h-0 flex-1'),
  'InteractiveMap root container has min-h-0 and flex-1 to fill parent container 100%'
);
assert(
  mapCode.includes('ResizeObserver') && mapCode.includes('window.google.maps.event.trigger(mapInstanceRef.current, \'resize\')'),
  'ResizeObserver configured on mapContainerRef to recalculate Google Maps tiles on any screen resize or mobile tab toggle'
);
assert(
  mapCode.includes('max-w-[calc(100vw-110px)] sm:max-w-none'),
  'Top-left HUD pill has constrained width on mobile screens to avoid overlapping custom toolbar'
);

// 3. Verify DashboardPage.tsx viewport and flex structure
console.log('\nTest 3: DashboardPage.tsx 100dvh & Panel Layout');
const dashboardCode = fs.readFileSync(path.join(srcDir, 'pages', 'DashboardPage.tsx'), 'utf-8');

assert(
  dashboardCode.includes('h-[100dvh]') && dashboardCode.includes('overflow-hidden'),
  'DashboardPage root uses dynamic viewport height (100dvh) with overflow-hidden'
);
assert(
  dashboardCode.includes("mobileView === 'map' ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'"),
  'Map panel uses flex flex-col when active on mobile for 100% height stretching'
);
assert(
  dashboardCode.includes('tripTitle={tripTitle}') && dashboardCode.includes('onUpdateTitle={setTripTitle}'),
  'Dashboard passes tripTitle and onUpdateTitle to Sidebar for mobile title editing'
);

// 4. Verify Sidebar.tsx mobile itinerary banner
console.log('\nTest 4: Sidebar.tsx Mobile Itinerary Title Bar');
const sidebarCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'Sidebar.tsx'), 'utf-8');

assert(
  sidebarCode.includes('md:hidden') && sidebarCode.includes('Itinerary'),
  'Sidebar contains a dedicated mobile itinerary title banner visible only on screens <md'
);
assert(
  sidebarCode.includes('onUpdateTitle') && sidebarCode.includes('isEditingTitle'),
  'Mobile users can rename their trip itinerary directly in the Trip Plan tab'
);

console.log('===========================================================');
if (failures === 0) {
  console.log('🎉 ALL ROUTEWISE RESPONSIVE LAYOUT TESTS PASSED!');
  console.log('===========================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`);
  console.log('===========================================================');
  process.exit(1);
}
