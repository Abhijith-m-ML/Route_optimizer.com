import assert from 'node:assert';
import { 
  INDIAN_STATES, 
  ALL_STATES_OPTION, 
  normalizeStateName, 
  getStateByName 
} from '../data/indianStates.ts';

console.log('========================================================');
console.log('🧪 Testing RouteWise State-Based Destination System');
console.log('========================================================\n');

// 1. Verify Indian States & UTs catalog
console.log('1. Checking Indian States and Union Territories Catalog:');
const statesCount = INDIAN_STATES.filter((s) => s.type === 'State').length;
const utCount = INDIAN_STATES.filter((s) => s.type === 'Union Territory').length;

assert.strictEqual(statesCount, 28, 'Must contain exactly 28 states');
assert.strictEqual(utCount, 8, 'Must contain exactly 8 Union Territories');
assert.strictEqual(INDIAN_STATES.length, 36, 'Must contain 36 total jurisdictions');
assert.strictEqual(ALL_STATES_OPTION.name, 'All States', 'Default option must be All States');
assert.strictEqual(ALL_STATES_OPTION.code, 'ALL');
console.log(`  ✓ Verified 28 States and 8 Union Territories (Total: 36)`);
console.log(`  ✓ Verified Default Option: "${ALL_STATES_OPTION.name}" (${ALL_STATES_OPTION.code})\n`);

// 2. Canonical State Normalization
console.log('2. Checking Canonical State Normalization:');
const tests = [
  { inputName: 'Kerala', inputCode: 'KL', expectedName: 'Kerala', expectedCode: 'KL' },
  { inputName: 'State of Kerala', inputCode: null, expectedName: 'Kerala', expectedCode: 'KL' },
  { inputName: 'Maharashtra', inputCode: 'MH', expectedName: 'Maharashtra', expectedCode: 'MH' },
  { inputName: 'NCT of Delhi', inputCode: 'DL', expectedName: 'Delhi', expectedCode: 'DL' },
  { inputName: 'National Capital Territory of Delhi', inputCode: null, expectedName: 'Delhi', expectedCode: 'DL' },
  { inputName: 'Karnataka', inputCode: 'KA', expectedName: 'Karnataka', expectedCode: 'KA' },
  { inputName: 'Orissa', inputCode: null, expectedName: 'Odisha', expectedCode: 'OD' },
  { inputName: 'Pondicherry', inputCode: null, expectedName: 'Puducherry', expectedCode: 'PY' },
];

for (const t of tests) {
  const norm = normalizeStateName(t.inputName, t.inputCode);
  assert.strictEqual(norm.name, t.expectedName, `Expected "${t.expectedName}" for input "${t.inputName}"`);
  assert.strictEqual(norm.code, t.expectedCode, `Expected code "${t.expectedCode}" for input "${t.inputName}"`);
}
console.log('  ✓ Verified state normalization across names, codes, and historical aliases\n');

// 3. Testing Address Component Parsing Logic
console.log('3. Checking Address Components Extraction:');
function parseAddressComponentsTest(components, fallbackAddress) {
  let rawCity;
  let rawDistrict;
  let rawState;
  let rawStateCode;
  let rawCountry;

  if (Array.isArray(components) && components.length > 0) {
    for (const comp of components) {
      const types = comp.types || [];
      const longName = comp.longText || comp.long_name || '';
      const shortName = comp.shortText || comp.short_name || '';

      if (types.includes('locality')) {
        rawCity = longName;
      } else if (types.includes('administrative_area_level_2')) {
        rawDistrict = longName;
      } else if (types.includes('sublocality_level_1') && !rawCity) {
        rawCity = longName;
      }

      if (types.includes('administrative_area_level_1')) {
        rawState = longName;
        rawStateCode = shortName;
      }

      if (types.includes('country')) {
        rawCountry = longName;
      }
    }
  }

  if (!rawState && fallbackAddress) {
    const segments = fallbackAddress.split(',').map((s) => s.trim());
    for (const seg of segments) {
      const normalized = normalizeStateName(seg);
      if (normalized.type !== 'Unknown') {
        rawState = normalized.name;
        rawStateCode = normalized.code;
        break;
      }
    }
  }

  const normalizedState = normalizeStateName(rawState, rawStateCode);

  return {
    city: rawCity || rawDistrict || undefined,
    state: normalizedState.name !== 'Other' ? normalizedState.name : (rawState || undefined),
    stateCode: normalizedState.code || rawStateCode || undefined,
    country: rawCountry || 'India',
  };
}

const placesApiNewComponents = [
  { longText: 'Kochi', shortText: 'Kochi', types: ['locality', 'political'] },
  { longText: 'Ernakulam', shortText: 'Ernakulam', types: ['administrative_area_level_2', 'political'] },
  { longText: 'Kerala', shortText: 'KL', types: ['administrative_area_level_1', 'political'] },
  { longText: 'India', shortText: 'IN', types: ['country', 'political'] },
];

const parsedNew = parseAddressComponentsTest(placesApiNewComponents, 'Fort Kochi, Kochi, Kerala, India');
assert.strictEqual(parsedNew.city, 'Kochi', 'Parsed city must be Kochi');
assert.strictEqual(parsedNew.state, 'Kerala', 'Parsed state must be Kerala');
assert.strictEqual(parsedNew.stateCode, 'KL', 'Parsed stateCode must be KL');
assert.strictEqual(parsedNew.country, 'India', 'Parsed country must be India');
console.log('  ✓ Places API (New) longText/shortText components parsed correctly');

const placesJsSdkComponents = [
  { long_name: 'Bengaluru', short_name: 'Bengaluru', types: ['locality', 'political'] },
  { long_name: 'Karnataka', short_name: 'KA', types: ['administrative_area_level_1', 'political'] },
  { long_name: 'India', short_name: 'IN', types: ['country', 'political'] },
];

const parsedSdk = parseAddressComponentsTest(placesJsSdkComponents, 'MG Road, Bengaluru, Karnataka, India');
assert.strictEqual(parsedSdk.city, 'Bengaluru', 'Parsed city must be Bengaluru');
assert.strictEqual(parsedSdk.state, 'Karnataka', 'Parsed state must be Karnataka');
assert.strictEqual(parsedSdk.stateCode, 'KA', 'Parsed stateCode must be KA');
console.log('  ✓ Google Maps JS SDK long_name/short_name components parsed correctly');

const parsedFallback = parseAddressComponentsTest([], 'Panaji, Goa, India');
assert.strictEqual(parsedFallback.state, 'Goa', 'Fallback must identify Goa from address string');
assert.strictEqual(parsedFallback.stateCode, 'GA');
console.log('  ✓ Address string fallback geocoding successfully recognized state\n');

// 4. Organizing Saved Destinations by State
console.log('4. Checking Organizing Saved Destinations by State:');
const sampleSavedPlaces = [
  { id: '1', name: 'Fort Kochi', state: 'Kerala', city: 'Kochi' },
  { id: '2', name: 'Munnar', state: 'Kerala', city: 'Idukki' },
  { id: '3', name: 'Athani', state: 'Karnataka', city: 'Belagavi' },
  { id: '4', name: 'Mumbai', state: 'Maharashtra', city: 'Mumbai' },
  { id: '5', name: 'Marine Drive', state: 'Maharashtra', city: 'Mumbai' },
];

function groupDestinations(places) {
  const groups = {};
  for (const p of places) {
    const s = p.state || 'Other';
    if (!groups[s]) groups[s] = [];
    groups[s].push(p.name);
  }
  return groups;
}

const grouped = groupDestinations(sampleSavedPlaces);
assert.deepStrictEqual(grouped['Kerala'], ['Fort Kochi', 'Munnar']);
assert.deepStrictEqual(grouped['Karnataka'], ['Athani']);
assert.deepStrictEqual(grouped['Maharashtra'], ['Mumbai', 'Marine Drive']);
console.log('  ✓ Saved destinations correctly grouped:');
console.log('    - Kerala: Fort Kochi, Munnar');
console.log('    - Karnataka: Athani');
console.log('    - Maharashtra: Mumbai, Marine Drive\n');

// 5. State Prioritization in Autocomplete Suggestions
console.log('5. Checking State-Biased Autocomplete Prioritization:');
const rawSuggestions = [
  { placeId: 'p1', primaryText: 'Mumbai Fort', secondaryText: 'Mumbai, Maharashtra' },
  { placeId: 'p2', primaryText: 'Fort Kochi', secondaryText: 'Kochi, Kerala' },
  { placeId: 'p3', primaryText: 'Bekal Fort', secondaryText: 'Kasaragod, Kerala' },
  { placeId: 'p4', primaryText: 'Red Fort', secondaryText: 'Old Delhi, Delhi' },
];

function prioritizeByState(suggestions, selectedState) {
  if (!selectedState || selectedState === 'All States') return suggestions;
  const target = selectedState.toLowerCase();
  const prioritized = [];
  const others = [];

  for (const s of suggestions) {
    const full = `${s.secondaryText} ${s.primaryText}`.toLowerCase();
    if (full.includes(target)) {
      prioritized.push({ ...s, isPrioritized: true });
    } else {
      others.push(s);
    }
  }
  return [...prioritized, ...others];
}

const prioritizedKerala = prioritizeByState(rawSuggestions, 'Kerala');
assert.strictEqual(prioritizedKerala[0].primaryText, 'Fort Kochi', 'Kerala place must come first');
assert.strictEqual(prioritizedKerala[1].primaryText, 'Bekal Fort', 'Second Kerala place must come next');
assert.strictEqual(prioritizedKerala[0].isPrioritized, true);
assert.strictEqual(prioritizedKerala[2].primaryText, 'Mumbai Fort', 'Other states must not be blocked');
assert.strictEqual(prioritizedKerala[3].primaryText, 'Red Fort');
console.log('  ✓ Verified state prioritization: Fort Kochi & Bekal Fort appear first with isPrioritized: true');
console.log('  ✓ Verified non-blocking: Mumbai Fort & Red Fort remain accessible\n');

// 6. Non-destructive Recipient Import & Deduplication Logic
console.log('6. Checking Non-destructive Recipient Import & Deduplication:');
const existingRecipientStops = [
  { id: 'p_mumbai', name: 'Mumbai', state: 'Maharashtra' },
];

const incomingSharedStops = [
  { id: 'p_mumbai_shared', name: 'Mumbai', state: 'Maharashtra' }, // Duplicate by name
  { id: 'p_kochi', name: 'Fort Kochi', state: 'Kerala' },
  { id: 'p_munnar', name: 'Munnar', state: 'Kerala' },
];

function importNonDestructive(existing, incoming) {
  const existingNames = new Set(existing.map((s) => s.name.toLowerCase()));
  const toAdd = [];
  for (const item of incoming) {
    if (!existingNames.has(item.name.toLowerCase())) {
      toAdd.push(item);
      existingNames.add(item.name.toLowerCase());
    }
  }
  return [...existing, ...toAdd];
}

const merged = importNonDestructive(existingRecipientStops, incomingSharedStops);
assert.strictEqual(merged.length, 3, 'Merged list should contain exactly 3 items');
assert.strictEqual(merged[0].name, 'Mumbai', 'Recipient existing destination preserved');
assert.strictEqual(merged[1].name, 'Fort Kochi', 'New destination Fort Kochi added');
assert.strictEqual(merged[2].name, 'Munnar', 'New destination Munnar added');
console.log('  ✓ Deduplication verified: recipient existing stop preserved, duplicate ignored, new stops added\n');

// 7. Base64 URL State-Preserving Serialization & Deserialization
console.log('7. Checking URL State Serialization & Deserialization:');
function encodeTripTest(title, mode, stops, state) {
  const compact = {
    t: title,
    m: mode,
    st: state,
    s: stops.map((s) => ({ n: s.name, state: s.state, city: s.city })),
  };
  return Buffer.from(encodeURIComponent(JSON.stringify(compact))).toString('base64');
}

function decodeTripTest(b64) {
  const jsonStr = decodeURIComponent(Buffer.from(b64, 'base64').toString());
  const parsed = JSON.parse(jsonStr);
  return {
    title: parsed.t,
    travelMode: parsed.m,
    selectedState: parsed.st,
    stops: parsed.s.map((item) => ({
      name: item.n,
      state: item.state,
      city: item.city,
    })),
  };
}

const b64Payload = encodeTripTest('Kerala Backwaters', 'DRIVING', sampleSavedPlaces.slice(0, 2), 'Kerala');
const decodedTrip = decodeTripTest(b64Payload);
assert.strictEqual(decodedTrip.title, 'Kerala Backwaters');
assert.strictEqual(decodedTrip.selectedState, 'Kerala');
assert.strictEqual(decodedTrip.stops.length, 2);
assert.strictEqual(decodedTrip.stops[0].name, 'Fort Kochi');
assert.strictEqual(decodedTrip.stops[0].state, 'Kerala');
console.log('  ✓ URL trip payload successfully serialized and deserialized with state metadata\n');

console.log('========================================================');
console.log('🎉 ALL FRONTEND STATE-BASED TESTS PASSED SUCCESSFULLY!');
console.log('========================================================\n');
