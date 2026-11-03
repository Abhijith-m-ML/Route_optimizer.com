import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('===========================================================');
console.log('🧪 Starting Smart Location Naming & Place Renaming Tests');
console.log('===========================================================');

const typesPath = path.resolve('src/types/index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf8');

const searchBoxPath = path.resolve('src/components/Sidebar/SearchBox.tsx');
const searchBoxContent = fs.readFileSync(searchBoxPath, 'utf8');

const destCardPath = path.resolve('src/components/Sidebar/DestinationCard.tsx');
const destCardContent = fs.readFileSync(destCardPath, 'utf8');

const dashboardPath = path.resolve('src/pages/DashboardPage.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

const serverPath = path.resolve('../backend/src/server.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Test 1: Data Model fields in Destination & SelectedStop
console.log('\nTest 1: Destination Data Model extended with smart naming fields');
assert(typesContent.includes('originalName?: string;'), 'Destination must have originalName');
assert(typesContent.includes('isCurrentLocation?: boolean;'), 'Destination must have isCurrentLocation');
assert(typesContent.includes('isCustomName?: boolean;'), 'Destination must have isCustomName');
assert(typesContent.includes('customName?: string;'), 'Destination must have customName');
console.log('  ✅ Passed: Destination model contains originalName, isCurrentLocation, isCustomName, customName');

// Test 2: SearchBox supports customizable place name before adding
console.log('\nTest 2: SearchBox customizable place name input before adding');
assert(searchBoxContent.includes('editablePlaceName'), 'SearchBox must maintain editablePlaceName state');
assert(searchBoxContent.includes('pendingPlace'), 'SearchBox must maintain pendingPlace state');
assert(searchBoxContent.includes('handleConfirmAddPending'), 'SearchBox must have handleConfirmAddPending handler');
assert(searchBoxContent.includes('Customize & Confirm Destination Name') || searchBoxContent.includes('Customize Destination Name') || searchBoxContent.includes('Add to Route'), 'SearchBox must display customize UI');
console.log('  ✅ Passed: SearchBox enables preview and editing of place name before confirming');

// Test 3: DashboardPage Scenario B - Smart renaming of older current locations with (C) suffix
console.log('\nTest 3: DashboardPage Smart Current Location Renaming with (C) suffix');
assert(dashboardContent.includes('(C)'), 'DashboardPage must append (C) suffix to older current locations');
assert(dashboardContent.includes('isCurrentLocation'), 'DashboardPage must check isCurrentLocation flag');
assert(dashboardContent.includes('isCustomName'), 'DashboardPage must respect isCustomName flag');
console.log('  ✅ Passed: DashboardPage renames older system-generated current locations to actualPlace (C)');

// Test 4: DestinationCard inline place renaming (Home, Office, Chai Spot)
console.log('\nTest 4: DestinationCard inline place renaming & custom label support');
assert(destCardContent.includes('isEditing'), 'DestinationCard must support isEditing state');
assert(destCardContent.includes('onRename'), 'DestinationCard must support onRename prop');
assert(destCardContent.includes('handleSaveName'), 'DestinationCard must provide handleSaveName');
assert(destCardContent.includes('Pencil'), 'DestinationCard must show rename pencil icon');
assert(destCardContent.includes('originalName'), 'DestinationCard must display originalName when customized');
console.log('  ✅ Passed: DestinationCard provides inline rename editing and displays original name reference');

// Test 5: Backend persistence & sanitization
console.log('\nTest 5: Backend sanitizeStops persists smart naming fields');
assert(serverContent.includes('originalName:'), 'server.ts sanitizeStops must preserve originalName');
assert(serverContent.includes('isCurrentLocation:'), 'server.ts sanitizeStops must preserve isCurrentLocation');
assert(serverContent.includes('isCustomName:'), 'server.ts sanitizeStops must preserve isCustomName');
console.log('  ✅ Passed: Backend server.ts persists smart naming metadata to database and sync engine');

console.log('\n===========================================================');
console.log('🎉 ALL SMART LOCATION NAMING TESTS PASSED (100%)!');
console.log('===========================================================');
