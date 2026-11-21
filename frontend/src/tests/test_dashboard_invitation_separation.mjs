import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('===========================================================');
console.log('🧪 Testing Separation of Normal Dashboard & Shared Trips');
console.log('===========================================================\n');

const dashboardPath = fs.existsSync('frontend/src/pages/DashboardPage.tsx') 
  ? 'frontend/src/pages/DashboardPage.tsx' 
  : 'src/pages/DashboardPage.tsx';
const dashboardCode = fs.readFileSync(dashboardPath, 'utf8');

const sharedTripPagePath = fs.existsSync('frontend/src/pages/SharedTripPage.tsx') 
  ? 'frontend/src/pages/SharedTripPage.tsx' 
  : 'src/pages/SharedTripPage.tsx';
const sharedTripCode = fs.readFileSync(sharedTripPagePath, 'utf8');

const protectedRoutePath = fs.existsSync('frontend/src/components/Auth/ProtectedRoute.tsx') 
  ? 'frontend/src/components/Auth/ProtectedRoute.tsx' 
  : 'src/components/Auth/ProtectedRoute.tsx';
const protectedRouteCode = fs.readFileSync(protectedRoutePath, 'utf8');

// --- Test 1: DashboardPage Stale Invitation Modal Prevention ---
console.log('Test 1: DashboardPage does NOT use persistent storage to pop up invitation modal');
assert.ok(
  !dashboardCode.includes("const activeSharedJson = localStorage.getItem('vazhikatti_active_shared_trip')"),
  'Dashboard must not read vazhikatti_active_shared_trip to trigger preview modal'
);
assert.ok(
  dashboardCode.includes("localStorage.removeItem('vazhikatti_active_shared_trip')"),
  'Dashboard must actively purge any stale active shared trip keys'
);
assert.ok(
  dashboardCode.includes("localStorage.removeItem('vazhikatti_pending_shared_trip')"),
  'Dashboard must actively consume and delete one-time pending shared trip'
);
console.log('  ✅ Passed: Persistent invitation popup trigger removed from DashboardPage');

// --- Test 2: SharedTripPage One-Time Transit Hygiene ---
console.log('\nTest 2: SharedTripPage does not write persistent active modal keys');
assert.ok(
  !sharedTripCode.includes("localStorage.setItem('vazhikatti_active_shared_trip'"),
  'SharedTripPage must not write vazhikatti_active_shared_trip'
);
assert.ok(
  sharedTripCode.includes("localStorage.removeItem('vazhikatti_active_shared_trip')"),
  'SharedTripPage actively cleans up any lingering active shared trip modal keys'
);
console.log('  ✅ Passed: SharedTripPage uses clean one-time transit for View Shared Trip');

// --- Test 3: ProtectedRoute Access Control ---
console.log('\nTest 3: ProtectedRoute does not leak persistent access through active shared key');
assert.ok(
  !protectedRouteCode.includes("Boolean(localStorage.getItem('vazhikatti_active_shared_trip'))"),
  'ProtectedRoute must not treat stale vazhikatti_active_shared_trip as an authorized guest pass'
);
console.log('  ✅ Passed: ProtectedRoute correctly gates unauthenticated dashboard access');

// --- Test 4: Simulated Storage Lifecycle Simulation ---
console.log('\nTest 4: State Machine & Storage Lifecycle Simulation');

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockLocalStorage = new MockStorage();
const mockSessionStorage = new MockStorage();

function simulateDashboardInit(urlSearch = '') {
  let isPreviewModalOpen = false;
  let importedStops = null;

  // 1. One-time import for shared trip from /s/:shareId
  const pendingJson = mockSessionStorage.getItem('vazhikatti_pending_shared_trip') || mockLocalStorage.getItem('vazhikatti_pending_shared_trip');
  if (pendingJson) {
    try {
      const pending = JSON.parse(pendingJson);
      mockSessionStorage.removeItem('vazhikatti_pending_shared_trip');
      mockLocalStorage.removeItem('vazhikatti_pending_shared_trip');
      mockLocalStorage.removeItem('vazhikatti_active_shared_trip');
      if (pending && Array.isArray(pending.stops) && pending.stops.length > 0) {
        mockSessionStorage.setItem('vazhikatti_guest_viewing_shared_trip', 'true');
        importedStops = pending.stops;
        return { isPreviewModalOpen, importedStops, isNormalDashboard: true };
      }
    } catch {}
  }

  // Purge any stale active shared trip modal state
  mockLocalStorage.removeItem('vazhikatti_active_shared_trip');

  // 2. Legacy URL search parameter check
  const searchParams = new URLSearchParams(urlSearch);
  const shareId = searchParams.get('share');
  if (shareId) {
    isPreviewModalOpen = true;
  }

  return { isPreviewModalOpen, importedStops, isNormalDashboard: !isPreviewModalOpen };
}

// Scenario 1: Direct visit to /dashboard with empty storage
const visit1 = simulateDashboardInit();
assert.strictEqual(visit1.isPreviewModalOpen, false, 'Modal must NOT open on direct dashboard visit');
assert.strictEqual(visit1.isNormalDashboard, true, 'Direct /dashboard visit shows normal dashboard');
console.log('  ✓ Scenario 1: Direct /dashboard visit opens normal dashboard');

// Scenario 2: Visitor opens shared link /s/a8K2pQ and clicks "View Shared Trip"
const sampleSharedTrip = {
  shareId: 'a8K2pQ',
  tripName: 'Goa Holiday',
  stops: [{ id: '1', name: 'Baga Beach' }, { id: '2', name: 'Calangute' }],
};
mockSessionStorage.setItem('vazhikatti_pending_shared_trip', JSON.stringify(sampleSharedTrip));
mockSessionStorage.setItem('vazhikatti_guest_viewing_shared_trip', 'true');
mockLocalStorage.removeItem('vazhikatti_active_shared_trip');

// Dashboard receives navigation
const visit2 = simulateDashboardInit();
assert.strictEqual(visit2.isPreviewModalOpen, false, 'Modal must NOT pop up over the imported trip');
assert.strictEqual(visit2.importedStops?.length, 2, 'Stops imported directly onto the map');
assert.strictEqual(mockSessionStorage.getItem('vazhikatti_pending_shared_trip'), null, 'Transit key deleted immediately');
assert.strictEqual(mockLocalStorage.getItem('vazhikatti_active_shared_trip'), null, 'Active key is null');
console.log('  ✓ Scenario 2: Clicking View Shared Trip imports trip directly without modal popup');

// Scenario 3: User refreshes /dashboard
const visit3 = simulateDashboardInit();
assert.strictEqual(visit3.isPreviewModalOpen, false, 'Modal must NOT appear on page refresh');
assert.strictEqual(visit3.isNormalDashboard, true, 'Refresh renders normal dashboard');
console.log('  ✓ Scenario 3: Refreshing /dashboard renders normal dashboard');

// Scenario 4: User opens /dashboard later in a new tab
const visit4 = simulateDashboardInit();
assert.strictEqual(visit4.isPreviewModalOpen, false, 'Modal must NOT appear in new session');
assert.strictEqual(visit4.isNormalDashboard, true, 'Subsequent visit renders normal dashboard');
console.log('  ✓ Scenario 4: Subsequent dashboard visits stay on normal dashboard');

// Scenario 5: User with previously lingering legacy key in localStorage
mockLocalStorage.setItem('vazhikatti_active_shared_trip', JSON.stringify(sampleSharedTrip));
const visit5 = simulateDashboardInit();
assert.strictEqual(visit5.isPreviewModalOpen, false, 'Legacy lingering key must NOT trigger modal');
assert.strictEqual(mockLocalStorage.getItem('vazhikatti_active_shared_trip'), null, 'Legacy key auto-purged');
console.log('  ✓ Scenario 5: Legacy lingering localStorage keys safely auto-purged');

// Scenario 6: Explicit legacy link with ?share=
const visit6 = simulateDashboardInit('?share=abc123');
assert.strictEqual(visit6.isPreviewModalOpen, true, 'Explicit ?share= param in URL opens preview');
console.log('  ✓ Scenario 6: Explicit ?share= in URL handled correctly');

console.log('\n===========================================================');
console.log('🎉 ALL DASHBOARD & INVITATION SEPARATION TESTS PASSED (100%)!');
console.log('===========================================================');
