import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('===========================================================');
console.log('🧪 Starting Shared-Trip Surprise Invitation Tests');
console.log('===========================================================');

const modalPath = path.resolve('src/components/SharedTripPreviewModal.tsx');
const modalContent = fs.readFileSync(modalPath, 'utf8');

// Test 1: Required Exact Texts
console.log('\nTest 1: Verification of exact required texts');
const requiredTexts = [
  'vazhikatti',
  'TRIP INVITATION',
  "YOU'VE BEEN INVITED TO EXPLORE",
  'A SURPRISE TRIP',
  'VIEW SHARED TRIP →',
  'Shared securely through Vazhikatti',
  'No external photos · No image API · Responsive design',
];

for (const text of requiredTexts) {
  assert(modalContent.includes(text), `Must contain exact text: "${text}"`);
  console.log(`  ✅ Passed: Contains "${text}"`);
}

// Test 2: Disallowed Content Filter
console.log('\nTest 2: Verification that details and disallowed elements are excluded');
const disallowedTexts = [
  'Your next adventure starts here',
  'YOUR JOURNEY',
  'Driving trip',
  'Explore shared route',
  '<img',
  'rating',
  'shortAddress',
];

for (const disallowed of disallowedTexts) {
  assert(!modalContent.includes(disallowed), `Must NOT contain: "${disallowed}"`);
  console.log(`  ✅ Passed: Free of "${disallowed}"`);
}

// Test 3: Design & Styling Requirements
console.log('\nTest 3: Verification of visual target design requirements');
assert(modalContent.includes('bg-black'), 'Must have pure black background');
assert(modalContent.includes('border-zinc-800'), 'Must have thin dark-grey border');
assert(modalContent.includes('rounded-3xl'), 'Must have rounded container corners');
assert(modalContent.includes('#0c1f38'), 'Must have dark navy-blue invitation card background');
assert(modalContent.includes('bg-white'), 'Must have large white button');
console.log('  ✅ Passed: Visual styling accurately implements reference design');

// Test 4: Action & Functionality
console.log('\nTest 4: Verification of click handler and navigation flow');
assert(modalContent.includes('handleViewSharedTrip'), 'Must have handleViewSharedTrip');
assert(modalContent.includes('onImport(stops'), 'Must invoke onImport to reveal destinations on click');
assert(modalContent.includes('onClose()'), 'Must close preview modal upon viewing');
console.log('  ✅ Passed: Functionality preserved, revealing trip upon button click');

console.log('\n===========================================================');
console.log('🎉 ALL SHARED TRIP INVITATION TESTS PASSED (100%)!');
console.log('===========================================================');

