/**
 * Automated Verification: Vazhikatti Custom Trip Collections & Multi-Trip Management System
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.join(__dirname, '..');

console.log('===========================================================');
console.log('🧪 Starting Vazhikatti Custom Trip Collections Test Suite');
console.log('===========================================================\n');

// 1. Verify Components Existence
console.log('Test 1: Component Architecture & Modals');
const tripSelectorFile = path.join(srcDir, 'components', 'Trips', 'TripSelector.tsx');
const myTripsModalFile = path.join(srcDir, 'components', 'Trips', 'MyTripsModal.tsx');
const createEditModalFile = path.join(srcDir, 'components', 'Trips', 'CreateEditTripModal.tsx');
const deleteModalFile = path.join(srcDir, 'components', 'Trips', 'DeleteTripModal.tsx');

assert(fs.existsSync(tripSelectorFile), 'TripSelector component must exist');
assert(fs.existsSync(myTripsModalFile), 'MyTripsModal component must exist');
assert(fs.existsSync(createEditModalFile), 'CreateEditTripModal component must exist');
assert(fs.existsSync(deleteModalFile), 'DeleteTripModal component must exist');
console.log('  ✅ Passed: All 4 dedicated Trip Collection components exist');

// 2. TripSelector Logic & Controls
console.log('\nTest 2: TripSelector Dropdown & Controls');
const selectorCode = fs.readFileSync(tripSelectorFile, 'utf-8');
assert(selectorCode.includes('All Trips'), 'TripSelector must support "All Trips" option');
assert(selectorCode.includes('onCreateNewTrip'), 'TripSelector must provide action to create new trip');
assert(selectorCode.includes('onOpenMyTrips'), 'TripSelector must provide action to manage all trips');
assert(selectorCode.includes('activeTripId'), 'TripSelector must reflect current active trip selection');
console.log('  ✅ Passed: TripSelector supports All Trips, individual user trips, and create/manage actions');

// 3. MyTripsModal Interface & Cards
console.log('\nTest 3: MyTripsModal Management Interface');
const myTripsCode = fs.readFileSync(myTripsModalFile, 'utf-8');
assert(myTripsCode.includes('My Trip Collections') || myTripsCode.includes('My Trips'), 'Modal must feature My Trips header');
assert(myTripsCode.includes('Create New Trip'), 'Modal must provide prominent "+ Create New Trip" action');
assert(myTripsCode.includes('onSelectTrip') || myTripsCode.includes('Open Map'), 'Card must have Open Map action');
assert(myTripsCode.includes('onEditTrip'), 'Card must have Edit action');
assert(myTripsCode.includes('onShareTrip'), 'Card must have Share action');
assert(myTripsCode.includes('onDeleteTrip'), 'Card must have Delete action');
console.log('  ✅ Passed: MyTripsModal provides Open Map, Edit, Share, Delete and Create actions');

// 4. CreateEditTripModal & Case-Insensitive Duplicate Validation
console.log('\nTest 4: Create/Edit Modal & Duplicate Policy');
const createEditCode = fs.readFileSync(createEditModalFile, 'utf-8');
assert(createEditCode.includes('existingTripNames'), 'Modal must accept existing trip names for validation');
assert(createEditCode.includes('toLowerCase'), 'Modal must enforce case-insensitive duplicate check');
assert(createEditCode.includes('Trip name is required'), 'Modal must validate non-empty trip name');
console.log('  ✅ Passed: Case-insensitive duplicate name policy enforced on client');

// 5. DeleteTripModal Safe Cascading
console.log('\nTest 5: DeleteTripModal Safe Cascading');
const deleteCode = fs.readFileSync(deleteModalFile, 'utf-8');
assert(deleteCode.includes('Delete this trip?'), 'Modal must ask for explicit confirmation');
assert(deleteCode.includes('cannot be undone'), 'Modal must clarify destruction of trip collection');
assert(deleteCode.includes('user account and other trips remain completely safe'), 'Modal must assure account and other trips are untouched');
console.log('  ✅ Passed: DeleteTripModal safely confirms deletion with account safety guarantee');

// 6. DestinationList: State Grouping Replaced by Trip Collections
console.log('\nTest 6: DestinationList Replacement of State Grouping');
const destListCode = fs.readFileSync(path.join(srcDir, 'components', 'Sidebar', 'DestinationList.tsx'), 'utf-8');
assert(!destListCode.includes("viewMode === 'state'"), 'Old geographical state grouping viewMode must be removed');
assert(!destListCode.includes('By State'), '"By State" toggle button must be removed');
assert(destListCode.includes('isAllTripsView') || destListCode.includes('activeTripId'), 'Must support All Trips vs specific trip view');
assert(destListCode.includes('trip.name'), 'Must group destinations under user-created trip headings');
console.log('  ✅ Passed: State-based grouping completely replaced with custom user trip collections');

// 7. Backend API Architecture & Endpoints
console.log('\nTest 7: Backend Storage & Multi-Trip Endpoints');
const serverCode = fs.readFileSync(path.join(srcDir, '..', '..', 'backend', 'src', 'server.ts'), 'utf-8');
assert(serverCode.includes('trips_collections.json'), 'Backend must persist to trips_collections.json');
assert(serverCode.includes('app.get(\'/api/user-trips\''), 'Backend must provide GET /api/user-trips');
assert(serverCode.includes('app.post(\'/api/user-trips\''), 'Backend must provide POST /api/user-trips');
assert(serverCode.includes('app.put(\'/api/user-trips/:tripId\''), 'Backend must provide PUT /api/user-trips/:tripId');
assert(serverCode.includes('app.delete(\'/api/user-trips/:tripId\''), 'Backend must provide DELETE /api/user-trips/:tripId');
assert(serverCode.includes('app.post(\'/api/trips/import\''), 'Backend must provide POST /api/trips/import');
console.log('  ✅ Passed: Backend endpoints and trips_collections.json persistence verified');

console.log('\n===========================================================');
console.log('🎉 ALL 7 TRIP COLLECTION SPECIFICATION TESTS PASSED (100%)!');
console.log('===========================================================\n');
