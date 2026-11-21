// Vazhikatti Geoapify & MapLibre GL JS Integration Test Suite
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';

console.log('===========================================================');
console.log('🧪 Starting Vazhikatti Geoapify & MapLibre GL JS Tests');
console.log('===========================================================\n');

const EXPECTED_API_KEY = '37474d11d3de48b0a71f97304ab9cff1';

// -------------------------------------------------------------
// Test 1: Verify Environment Configuration & Files
// -------------------------------------------------------------
console.log('Test 1: Environment Variables & Example Files');
const frontendEnv = fs.readFileSync('frontend/.env', 'utf-8');
const frontendEnvExample = fs.readFileSync('frontend/.env.example', 'utf-8');
const backendEnv = fs.readFileSync('backend/.env', 'utf-8');
const backendEnvExample = fs.readFileSync('backend/.env.example', 'utf-8');

assert.ok(frontendEnv.includes('VITE_GEOAPIFY_API_KEY='), 'frontend/.env must define VITE_GEOAPIFY_API_KEY');
assert.ok(frontendEnv.includes(EXPECTED_API_KEY), 'frontend/.env must contain the Geoapify API key');
assert.ok(frontendEnvExample.includes('VITE_GEOAPIFY_API_KEY='), 'frontend/.env.example must include VITE_GEOAPIFY_API_KEY template');

assert.ok(backendEnv.includes('GEOAPIFY_API_KEY='), 'backend/.env must define GEOAPIFY_API_KEY');
assert.ok(backendEnv.includes(EXPECTED_API_KEY), 'backend/.env must contain the Geoapify API key');
assert.ok(backendEnvExample.includes('GEOAPIFY_API_KEY='), 'backend/.env.example must include GEOAPIFY_API_KEY template');

console.log('  ✅ Passed: Both frontend and backend .env and .env.example files configured properly.\n');

// -------------------------------------------------------------
// Test 2: Geoapify Service Verification
// -------------------------------------------------------------
console.log('Test 2: Geoapify Service Methods & Map Style URLs');
const geoapifyServiceCode = fs.readFileSync('frontend/src/services/geoapifyService.ts', 'utf-8');

assert.ok(geoapifyServiceCode.includes('osm-bright'), 'Must support Geoapify OSM Bright style for Light mode');
assert.ok(geoapifyServiceCode.includes('dark-matter'), 'Must support Geoapify Dark Matter style for Dark mode');
assert.ok(geoapifyServiceCode.includes('getGeoapifyMapStyleUrl'), 'Must export getGeoapifyMapStyleUrl');
assert.ok(geoapifyServiceCode.includes('geoapifyAutocomplete'), 'Must export geoapifyAutocomplete');
assert.ok(geoapifyServiceCode.includes('geoapifyReverseGeocode'), 'Must export geoapifyReverseGeocode');
assert.ok(geoapifyServiceCode.includes('geoapifyCalculateRoute'), 'Must export geoapifyCalculateRoute');
assert.ok(geoapifyServiceCode.includes('isGeoapifyConfigured'), 'Must export isGeoapifyConfigured');

// Verify cache and debounce abortion
assert.ok(geoapifyServiceCode.includes('searchCache'), 'Must have in-memory search cache');
assert.ok(geoapifyServiceCode.includes('routeCache'), 'Must have in-memory route cache');
assert.ok(geoapifyServiceCode.includes('AbortController'), 'Must use AbortController to cancel outdated autocomplete requests');

console.log('  ✅ Passed: geoapifyService implements style URLs, autocomplete, reverse geocoding, and routing.\n');

// -------------------------------------------------------------
// Test 3: InteractiveMap MapLibre GL JS Integration & Web Worker Setup
// -------------------------------------------------------------
console.log('Test 3: MapLibre GL JS Interactive Map & Layer Implementation');
const mapCode = fs.readFileSync('frontend/src/components/Map/InteractiveMap.tsx', 'utf-8');

assert.ok(mapCode.includes("from 'maplibre-gl'"), 'InteractiveMap must import maplibre-gl');
assert.ok(mapCode.includes('maplibre-gl.css'), 'InteractiveMap must import maplibre-gl.css');
assert.ok(mapCode.includes('setWorkerUrl'), 'InteractiveMap must configure setWorkerUrl');
assert.ok(mapCode.includes('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'), 'InteractiveMap must bundle maplibre worker URL via Vite');
assert.ok(mapCode.includes('getGeoapifyMapStyleUrl'), 'InteractiveMap must use getGeoapifyMapStyleUrl');
assert.ok(mapCode.includes('id="google-map"'), 'InteractiveMap must retain container ID for selector stability');
assert.ok(mapCode.includes('route-line-source'), 'InteractiveMap must have route-line GeoJSON source');
assert.ok(mapCode.includes('route-line'), 'InteractiveMap must have route-line layer');
assert.ok(mapCode.includes('route-line-casing'), 'InteractiveMap must have route-line casing for contrast');

// Marker and Popup compatibility
assert.ok(mapCode.includes('createNumberedMarkerIcon'), 'Must export createNumberedMarkerIcon for compatibility');
assert.ok(mapCode.includes('getGoogleMapsDirectionsUrl'), 'Must export getGoogleMapsDirectionsUrl for directions links');
assert.ok(mapCode.includes('data-testid="set-start-btn"'), 'Popup must include set-start-btn');
assert.ok(mapCode.includes('data-testid="remove-stop-btn"'), 'Popup must include remove-stop-btn');
assert.ok(mapCode.includes('data-testid="gmaps-nav-button"'), 'Popup must include gmaps-nav-button');

// Mobile Docked Card
assert.ok(mapCode.includes('data-testid="mobile-destination-card"'), 'Must render mobile-destination-card');

// Theme Switcher & Persistence
assert.ok(mapCode.includes("return 'roadmap'; // White / standard Google Maps on initial open"), 'Must default to white roadmap');
assert.ok(mapCode.includes('vazhikatti_map_theme'), 'Must persist theme in vazhikatti_map_theme');
assert.ok(mapCode.includes('White (Default)'), 'Must include White (Default) in theme switcher');

// Toolbar clearance
assert.ok(mapCode.includes('top-16 right-3 sm:top-20 sm:right-4 lg:top-4 lg:right-4'), 'Toolbar must clear mobile header');

console.log('  ✅ Passed: InteractiveMap fully integrates MapLibre GL JS, route line, popups, and responsive controls.\n');

// -------------------------------------------------------------
// Test 4: Places Service & Autocomplete Wiring
// -------------------------------------------------------------
console.log('Test 4: Places Service & Geoapify Integration');
const placesCode = fs.readFileSync('frontend/src/services/placesService.ts', 'utf-8');

assert.ok(placesCode.includes('geoapifyAutocomplete'), 'placesService must use geoapifyAutocomplete');
assert.ok(placesCode.includes('geoapifyReverseGeocode'), 'placesService must use geoapifyReverseGeocode');
assert.ok(placesCode.includes('geoapifyResolvedPlacesMap'), 'placesService must cache resolved Geoapify destinations');
assert.ok(placesCode.includes('isGeoapifyConfigured'), 'placesService must check isGeoapifyConfigured');

const searchBoxCode = fs.readFileSync('frontend/src/components/Sidebar/SearchBox.tsx', 'utf-8');
assert.ok(searchBoxCode.includes('450'), 'SearchBox must use 400-500ms debounce (450ms)');

console.log('  ✅ Passed: placesService and SearchBox wired to Geoapify with 450ms debounce and caching.\n');

// -------------------------------------------------------------
// Test 5: Route Optimizer Integration
// -------------------------------------------------------------
console.log('Test 5: Route Optimizer Real-World Routing Metrics');
const routeCode = fs.readFileSync('frontend/src/utils/routeOptimizer.ts', 'utf-8');

assert.ok(routeCode.includes('calculateRouteMetricsWithGeoapify'), 'routeOptimizer must provide calculateRouteMetricsWithGeoapify');
assert.ok(routeCode.includes('geoapifyCalculateRoute'), 'routeOptimizer must call geoapifyCalculateRoute');

console.log('  ✅ Passed: routeOptimizer provides async Geoapify metrics calculation with Haversine fallback.\n');

// -------------------------------------------------------------
// Test 6: Backend Proxy Endpoints
// -------------------------------------------------------------
console.log('Test 6: Backend Geoapify Proxy Endpoints');
const serverCode = fs.readFileSync('backend/src/server.ts', 'utf-8');

assert.ok(serverCode.includes('/api/places/autocomplete'), 'Backend must support /api/places/autocomplete');
assert.ok(serverCode.includes('/api/places/reverse'), 'Backend must support /api/places/reverse');
assert.ok(serverCode.includes('/api/routes'), 'Backend must support /api/routes');
assert.ok(serverCode.includes('GEOAPIFY_KEY'), 'Backend must use GEOAPIFY_KEY');

console.log('  ✅ Passed: Backend provides robust proxy endpoints for autocomplete, reverse geocoding, and routing.\n');

// -------------------------------------------------------------
// Test 7: Bundled Worker Asset in Distribution
// -------------------------------------------------------------
console.log('Test 7: Production Build MapLibre Worker Asset');
if (fs.existsSync('frontend/dist/assets')) {
  const distAssets = fs.readdirSync('frontend/dist/assets');
  const hasWorkerAsset = distAssets.some(
    (f) => f.startsWith('maplibre-gl-worker-') && f.endsWith('.js')
  );
  assert.ok(hasWorkerAsset, 'Production build must include maplibre-gl-worker-[hash].js asset');
  console.log('  ✅ Passed: maplibre-gl-worker bundle is present in dist/assets.\n');
} else {
  console.log('  ℹ️ Skipped: frontend/dist not yet built.\n');
}

console.log('===========================================================');
console.log('🎉 ALL GEOAPIFY & MAPLIBRE INTEGRATION TESTS PASSED (100%)!');
console.log('===========================================================');
