// RouteWise SearchBox & Current Location Test Suite
import assert from 'node:assert';
import fs from 'node:fs';

console.log('===========================================================');
console.log('🧪 Starting SearchBox & Current Location Logic Tests');
console.log('===========================================================\n');

// 1. Verify SearchBox source code checks
const searchBoxCode = fs.readFileSync('src/components/Sidebar/SearchBox.tsx', 'utf8');

console.log('Test 1: Quick chips removed from SearchBox');
assert.strictEqual(searchBoxCode.includes('POPULAR_MUMBAI_LANDMARKS'), false, 'POPULAR_MUMBAI_LANDMARKS must be removed');
assert.strictEqual(searchBoxCode.includes('Quick:'), false, 'Quick: chips section must be removed');
console.log('  ✅ Passed: Quick chips removed completely.');

console.log('\nTest 2: Placeholder and search messaging generalized (not restricted to Mumbai)');
assert.strictEqual(searchBoxCode.includes('Search places in Mumbai...'), false, 'Old placeholder with Mumbai must be removed');
assert.ok(searchBoxCode.includes('Search places, landmarks, or addresses...'), 'New generalized placeholder present');
assert.strictEqual(searchBoxCode.includes('Searching Google Places in Mumbai...'), false, 'Searching text must not be restricted to Mumbai');
console.log('  ✅ Passed: Search placeholder and feedback are generalized.');

console.log('\nTest 3: "Add Current Location" suggestion item in dropdown on click/focus');
assert.ok(searchBoxCode.includes('Add Current Location'), 'Add Current Location suggestion must be present');
assert.ok(searchBoxCode.includes('LocateFixed'), 'LocateFixed GPS icon must be present');
assert.ok(searchBoxCode.includes('handleUseCurrentLocation'), 'Current location handler must be implemented');
assert.ok(searchBoxCode.includes('navigator.geolocation'), 'Uses browser geolocation API');
console.log('  ✅ Passed: "Add Current Location" suggestion item and geolocation workflow integrated.');

console.log('\nTest 4: placesService removed hardcoded Mumbai 50km location bias');
const placesServiceCode = fs.readFileSync('src/services/placesService.ts', 'utf8');
assert.strictEqual(placesServiceCode.includes('radius: 50000.0'), false, '50km circle bias must be removed');
assert.strictEqual(placesServiceCode.includes('textQuery: `${query}, Mumbai`'), false, 'Hardcoded `, Mumbai` suffix must be removed');
console.log('  ✅ Passed: placesService search is not restricted to Mumbai.');

console.log('\n===========================================================');
console.log('🎉 ALL SEARCHBOX & CURRENT LOCATION TESTS PASSED!');
console.log('===========================================================\n');
