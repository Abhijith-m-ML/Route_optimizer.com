import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('🧪 Starting Simplify Map Header & Automatic Place Saving Tests');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ Passed: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ Failed: ${name}`);
    console.error(`     Error: ${err.message}`);
  }
}

// Read relevant source files
const dashboardFile = fs.readFileSync(path.resolve('frontend/src/pages/DashboardPage.tsx'), 'utf-8');
const navbarFile = fs.readFileSync(path.resolve('frontend/src/components/Navbar.tsx'), 'utf-8');
const settingsModalFile = fs.readFileSync(path.resolve('frontend/src/components/Navigation/SettingsModal.tsx'), 'utf-8');
const interactiveMapFile = fs.readFileSync(path.resolve('frontend/src/components/Map/InteractiveMap.tsx'), 'utf-8');
const tripServiceFile = fs.readFileSync(path.resolve('frontend/src/services/tripService.ts'), 'utf-8');

console.log('--- 1. Verification of Removed Top Bars on Mobile & Tablet ---');

test('Top Navbar is hidden on mobile/tablet (hidden lg:block)', () => {
  assert.ok(
    dashboardFile.includes('className="hidden lg:block flex-shrink-0"'),
    'Navbar should be wrapped in hidden lg:block so it is not visible on mobile/tablet'
  );
});

test('Second horizontal bar (Interactive Map | Trip Plan tab bar) is completely removed from mobile map', () => {
  assert.ok(
    !dashboardFile.includes('role="tab"'),
    'The old tab bar with role="tab" should no longer exist in DashboardPage'
  );
  assert.ok(
    !dashboardFile.includes('grid grid-cols-2 gap-1.5 p-1 rounded-2xl border shadow-inner'),
    'The old 2-column tab toggle container must be removed'
  );
});

console.log('\n--- 2. Single Settings Icon in Top-Right Corner ---');

test('Floating Settings gear icon exists over the map', () => {
  assert.ok(
    dashboardFile.includes('data-testid="polarsteps-settings-button"'),
    'Settings button should have test ID polarsteps-settings-button'
  );
  assert.ok(
    dashboardFile.includes('fixed top-4 right-4 z-40 lg:hidden'),
    'Settings button should be fixed at top-4 right-4 with z-40 and hidden on lg screens'
  );
  assert.ok(
    dashboardFile.includes('w-11 h-11 rounded-full backdrop-blur-md shadow-lg border'),
    'Settings button should have translucent circular container'
  );
});

test('Settings icon adapts to Light Mode and Dark Mode', () => {
  assert.ok(
    dashboardFile.includes('bg-slate-900/85 text-slate-200') && dashboardFile.includes('bg-white/90 text-slate-700'),
    'Settings button should have both Dark and Light theme classes'
  );
});

test('Settings icon respects safe areas on mobile devices', () => {
  assert.ok(
    dashboardFile.includes("marginTop: 'env(safe-area-inset-top, 0px)'"),
    'Settings button must respect safe area insets via env(safe-area-inset-top)'
  );
});

console.log('\n--- 3. Settings Modal Housing All Existing Functionality ---');

test('SettingsModal component file exists and is imported', () => {
  assert.ok(
    dashboardFile.includes("import { SettingsModal } from '../components/Navigation/SettingsModal'"),
    'SettingsModal must be imported in DashboardPage'
  );
  assert.ok(
    dashboardFile.includes('<SettingsModal'),
    'SettingsModal must be rendered in DashboardPage'
  );
});

test('SettingsModal provides Interactive Map and Trip Plan view toggle', () => {
  assert.ok(
    settingsModalFile.includes('Interactive Map'),
    'SettingsModal should contain Interactive Map option'
  );
  assert.ok(
    settingsModalFile.includes('Trip Plan'),
    'SettingsModal should contain Trip Plan option'
  );
  assert.ok(
    settingsModalFile.includes("onSelectView('map')") && settingsModalFile.includes("onSelectView('sidebar')"),
    'SettingsModal should invoke onSelectView with map or sidebar'
  );
});

test('SettingsModal provides My Trips Collections (Compass)', () => {
  assert.ok(
    settingsModalFile.includes('My Trips Collections'),
    'SettingsModal must provide My Trips Collections'
  );
  assert.ok(
    settingsModalFile.includes('onOpenMyTrips'),
    'SettingsModal must call onOpenMyTrips'
  );
});

test('SettingsModal provides Share Trip & Places', () => {
  assert.ok(
    settingsModalFile.includes('Share Trip & Places') || settingsModalFile.includes('Share Trips & Places'),
    'SettingsModal must provide Share Trip & Places'
  );
  assert.ok(
    settingsModalFile.includes('onOpenShare'),
    'SettingsModal must call onOpenShare'
  );
});

test('SettingsModal provides Reset Current Route (Undo)', () => {
  assert.ok(
    settingsModalFile.includes('Reset Current Route'),
    'SettingsModal must provide Reset Current Route'
  );
  assert.ok(
    settingsModalFile.includes('onResetRoute'),
    'SettingsModal must call onResetRoute'
  );
});

test('SettingsModal provides Theme selection (Light/Dark Mode toggle)', () => {
  assert.ok(
    settingsModalFile.includes('toggleTheme'),
    'SettingsModal must include toggleTheme'
  );
  assert.ok(
    settingsModalFile.includes('Theme Mode'),
    'SettingsModal must display Theme Mode option'
  );
});

test('SettingsModal provides App Guide & Tutorial (Help)', () => {
  assert.ok(
    settingsModalFile.includes('App Guide & Tutorial'),
    'SettingsModal must provide App Guide & Tutorial'
  );
  assert.ok(
    settingsModalFile.includes('onOpenHelp'),
    'SettingsModal must call onOpenHelp'
  );
});

test('SettingsModal provides User Profile & Session Management', () => {
  assert.ok(
    settingsModalFile.includes('handleLogout'),
    'SettingsModal must handle user logout'
  );
  assert.ok(
    settingsModalFile.includes('userDisplayName'),
    'SettingsModal must show user profile information'
  );
});

console.log('\n--- 4. Removal of Manual Save Button & Automatic Place Saving ---');

test('Manual Save button is removed from Navbar', () => {
  assert.ok(
    !navbarFile.includes('title="Save your trip"'),
    'Manual Save button with title "Save your trip" must be removed'
  );
  assert.ok(
    navbarFile.includes('Auto-Saved') || navbarFile.includes('Saved'),
    'Navbar should display auto-save status indicator instead of manual button'
  );
});

test('Automatic place addition persists immediately to backend & local storage', () => {
  assert.ok(
    dashboardFile.includes('persistTripUpdates(updatedTrip)'),
    'handleAddStop must invoke persistTripUpdates'
  );
  assert.ok(
    dashboardFile.includes('updateUserTrip('),
    'persistTripUpdates must call updateUserTrip for cloud persistence'
  );
  assert.ok(
    dashboardFile.includes('saveLocalTrips(next, userId)'),
    'persistTripUpdates must immediately persist to localStorage'
  );
});

test('Automatic place deletion persists immediately and removes stop completely', () => {
  assert.ok(
    dashboardFile.includes('handleRemoveStop = (id: string) => {'),
    'handleRemoveStop handler must exist'
  );
  assert.ok(
    dashboardFile.includes('const remaining = ownerTrip.stops.filter((s) => s.id !== id);') ||
    dashboardFile.includes('const remaining = activeTrip.stops.filter((s) => s.id !== id);'),
    'handleRemoveStop must filter out the target stop'
  );
  assert.ok(
    dashboardFile.includes('persistTripUpdates('),
    'handleRemoveStop must invoke persistTripUpdates with the remaining stops'
  );
});

test('Temporary offline/network failure queue & online reconnection handling', () => {
  assert.ok(
    dashboardFile.includes('queuePendingSyncTrip'),
    'Offline queue helper queuePendingSyncTrip must exist'
  );
  assert.ok(
    dashboardFile.includes('flushPendingSyncQueue'),
    'Offline queue flush helper flushPendingSyncQueue must exist'
  );
  assert.ok(
    dashboardFile.includes("window.addEventListener('online', handleOnline)"),
    'Must handle automatic sync upon reconnecting to network'
  );
});

test('Multi-device synchronization on window focus and visibility change', () => {
  assert.ok(
    dashboardFile.includes("window.addEventListener('focus', handleFocus)"),
    'Must sync remote trips on window focus'
  );
  assert.ok(
    dashboardFile.includes("document.addEventListener('visibilitychange', handleVisibilityChange)"),
    'Must sync remote trips on document visibility change'
  );
});

console.log('\n--- 5. Map Toolbar Clearance & Responsive Layout ---');

test('InteractiveMap custom toolbar does not overlap top-right Settings button', () => {
  assert.ok(
    interactiveMapFile.includes('top-16 right-3 sm:top-20 sm:right-4 lg:top-4 lg:right-4'),
    'Map toolbar should be positioned below the Settings button on mobile'
  );
});

console.log('\n================================================================');
if (passedTests === totalTests) {
  console.log(`🎉 ALL ${totalTests} TESTS PASSED (100%)!`);
} else {
  console.log(`⚠️ ${passedTests}/${totalTests} TESTS PASSED.`);
  process.exit(1);
}
console.log('================================================================');
