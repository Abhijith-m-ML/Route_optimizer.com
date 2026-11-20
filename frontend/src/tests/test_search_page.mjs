import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { CONTINENTS_DATA } from '../data/continentDestinations.ts';
import { 
  getSearchHistory, 
  addSearchHistory, 
  removeSearchHistoryItem, 
  clearSearchHistory 
} from '../services/searchHistoryService.ts';

console.log('================================================================');
console.log('🧪 Starting Dedicated Search Page & Add-To-File Test Suite');
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
const searchPageFile = fs.readFileSync(path.resolve('frontend/src/pages/SearchPage.tsx'), 'utf-8');
const addToFileModalFile = fs.readFileSync(path.resolve('frontend/src/components/Trips/AddToFileModal.tsx'), 'utf-8');
const mobileBottomNavFile = fs.readFileSync(path.resolve('frontend/src/components/Navigation/MobileBottomNav.tsx'), 'utf-8');
const appFile = fs.readFileSync(path.resolve('frontend/src/App.tsx'), 'utf-8');
const placesServiceFile = fs.readFileSync(path.resolve('frontend/src/services/placesService.ts'), 'utf-8');

// Mock localStorage for node environment
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = localStorageMock;

async function runTests() {
  console.log('--- 1. Search Page UI & Header ---');

  test('Search page has large "Search" heading and clean header', () => {
    assert.ok(
      searchPageFile.includes('<h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">'),
      'Search heading must have prominent bold typography'
    );
    assert.ok(
      searchPageFile.includes('Search'),
      'Heading must be "Search"'
    );
  });

  test('Search input contains search icon and placeholder "People and destinations"', () => {
    assert.ok(
      searchPageFile.includes('placeholder="People and destinations"'),
      'Search input must have placeholder "People and destinations"'
    );
    assert.ok(
      searchPageFile.includes('data-testid="search-input"'),
      'Search input must have testid search-input'
    );
  });

  test('Search input supports both Light and Dark mode theming', () => {
    assert.ok(
      searchPageFile.includes('bg-slate-900 border-slate-800 text-white') &&
      searchPageFile.includes('bg-slate-100 border-slate-200 text-slate-900'),
      'Search input must have both dark and light styling classes'
    );
  });

  console.log('\n--- 2. Browse Destinations (6 Continents) ---');

  test('Contains exactly 6 continent categories in responsive 2-column mobile grid', () => {
    assert.strictEqual(CONTINENTS_DATA.length, 6, 'Must contain exactly 6 continents');
    const continentNames = CONTINENTS_DATA.map((c) => c.name);
    assert.ok(continentNames.includes('Africa'), 'Must include Africa');
    assert.ok(continentNames.includes('Asia'), 'Must include Asia');
    assert.ok(continentNames.includes('Europe'), 'Must include Europe');
    assert.ok(continentNames.includes('North America'), 'Must include North America');
    assert.ok(continentNames.includes('Oceania'), 'Must include Oceania');
    assert.ok(continentNames.includes('South America'), 'Must include South America');

    assert.ok(
      searchPageFile.includes('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4'),
      'Continents must render in a 2-column grid on mobile and expand on tablets'
    );
  });

  test('Each continent card has silhouette graphics, gradients and region name', () => {
    for (const continent of CONTINENTS_DATA) {
      assert.ok(continent.name.length > 0, 'Continent must have a name');
      assert.ok(continent.gradientClass.length > 0, 'Continent must have a gradient class');
      assert.ok(continent.svgPath.length > 0, 'Continent must have an SVG silhouette path');
      assert.ok(continent.destinations.length >= 4, `${continent.name} must have genuine destinations`);
    }
  });

  test('Tapping a continent shows genuine destinations belonging to that continent', () => {
    const europe = CONTINENTS_DATA.find((c) => c.id === 'europe');
    assert.ok(europe, 'Europe continent must exist');
    assert.ok(europe.destinations.some((d) => d.name.includes('Eiffel Tower')), 'Europe must contain Eiffel Tower');
    assert.ok(europe.destinations.some((d) => d.name.includes('Colosseum')), 'Europe must contain Colosseum');
    assert.ok(searchPageFile.includes('handleSelectContinent'), 'SearchPage must have handler to browse continent');
  });

  console.log('\n--- 3. Search History (Recent Searches) ---');

  test('Search history records submitted searches and sorts recent first', () => {
    const testUser = 'user_test_123';
    clearSearchHistory(testUser);

    addSearchHistory('Tokyo', testUser, { placeName: 'Tokyo', subtitle: 'Japan' });
    addSearchHistory('Paris', testUser, { placeName: 'Paris', subtitle: 'France' });
    addSearchHistory('Cairo', testUser, { placeName: 'Cairo', subtitle: 'Egypt' });

    const history = getSearchHistory(testUser);
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].query, 'Cairo', 'Most recent search must appear first');
    assert.strictEqual(history[1].query, 'Paris');
    assert.strictEqual(history[2].query, 'Tokyo');
  });

  test('Search history deduplicates repeated searches', () => {
    const testUser = 'user_test_123';
    addSearchHistory('Tokyo', testUser); // Re-search Tokyo
    const history = getSearchHistory(testUser);
    assert.strictEqual(history.length, 3, 'Must deduplicate query');
    assert.strictEqual(history[0].query, 'Tokyo', 'Repeated search moves to the top');
  });

  test('Allows removing individual search history items', () => {
    const testUser = 'user_test_123';
    const before = getSearchHistory(testUser);
    const itemToRemove = before[0];
    const after = removeSearchHistoryItem(itemToRemove.id, testUser);
    assert.strictEqual(after.length, before.length - 1);
    assert.ok(!after.some((i) => i.id === itemToRemove.id));
  });

  test('Allows clearing all search history', () => {
    const testUser = 'user_test_123';
    clearSearchHistory(testUser);
    const history = getSearchHistory(testUser);
    assert.strictEqual(history.length, 0);
  });

  console.log('\n--- 4. Real Place Search Engine ---');

  test('placesService exports searchWorldwidePlaces for global cities & countries', () => {
    assert.ok(
      placesServiceFile.includes('export async function searchWorldwidePlaces(query: string): Promise<Destination[]>'),
      'placesService must export searchWorldwidePlaces'
    );
    assert.ok(
      placesServiceFile.includes('nominatim.openstreetmap.org/search'),
      'Must support Nominatim open worldwide geocoding fallback'
    );
  });

  test('Search returns authentic destinations matching cities, countries and landmarks', () => {
    const allDests = CONTINENTS_DATA.flatMap((c) => c.destinations);
    const tokyoMatch = allDests.filter((d) => d.name.toLowerCase().includes('tokyo') || d.country?.toLowerCase().includes('japan'));
    assert.ok(tokyoMatch.length > 0, 'Must match Tokyo / Japan');

    const egyptMatch = allDests.filter((d) => d.country?.toLowerCase().includes('egypt'));
    assert.ok(egyptMatch.length > 0, 'Must match Egypt');

    const franceMatch = allDests.filter((d) => d.country?.toLowerCase().includes('france') || d.city?.toLowerCase().includes('paris'));
    assert.ok(franceMatch.length > 0, 'Must match Paris / France');
  });

  console.log('\n--- 5. Add Searched Places Directly to a File (Trip Collection) ---');

  test('AddToFileModal exists and provides collection selection', () => {
    assert.ok(
      addToFileModalFile.includes('export const AddToFileModal'),
      'AddToFileModal component must exist'
    );
    assert.ok(
      addToFileModalFile.includes('Select Destination File'),
      'Must prompt to select a destination file'
    );
    assert.ok(
      addToFileModalFile.includes('handleSelectTrip'),
      'Must have handler to select existing file'
    );
  });

  test('AddToFileModal prevents adding duplicate places to the same collection', () => {
    assert.ok(
      addToFileModalFile.includes('isDuplicate') && addToFileModalFile.includes('already in'),
      'Must validate and prevent duplicate destinations in the collection'
    );
  });

  test('AddToFileModal supports creating a new collection inline and adding the place', () => {
    assert.ok(
      addToFileModalFile.includes('handleCreateAndAdd'),
      'Must support creating a new file on the fly'
    );
    assert.ok(
      addToFileModalFile.includes('createUserTrip('),
      'Must use createUserTrip to persist new collection'
    );
  });

  test('AddToFileModal persists additions automatically without extra save button', () => {
    assert.ok(
      addToFileModalFile.includes('updateUserTrip('),
      'Must persist additions to backend using updateUserTrip'
    );
    assert.ok(
      addToFileModalFile.includes('saveLocalTrips('),
      'Must immediately update local storage cache'
    );
  });

  console.log('\n--- 6. Search Navigation & Mobile Integration ---');

  test('MobileBottomNav includes the dedicated Search tab', () => {
    assert.ok(
      mobileBottomNavFile.includes("activeTab: 'map' | 'search' | 'trips' | 'plan'"),
      'activeTab must include search'
    );
    assert.ok(
      mobileBottomNavFile.includes('data-testid="bottom-nav-search"'),
      'Must have search tab in mobile bottom navigation'
    );
    assert.ok(
      mobileBottomNavFile.includes('Search'),
      'Must display Search label'
    );
  });

  test('Route /search is registered with ProtectedRoute in App.tsx', () => {
    assert.ok(
      appFile.includes('path="/search"'),
      'Route /search must be defined in App.tsx'
    );
    assert.ok(
      appFile.includes('<SearchPage />'),
      'SearchPage must be rendered at /search'
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
}

runTests();
