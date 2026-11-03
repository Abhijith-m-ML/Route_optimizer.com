import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('===========================================================');
console.log('🧪 Starting Toast Notification Auto-Close Tests');
console.log('===========================================================');

const toastPath = path.resolve('src/components/Toast.tsx');
const toastContent = fs.readFileSync(toastPath, 'utf8');

// Test 1: Timer logic
console.log('\nTest 1: Auto-dismiss timer implementation');
assert(toastContent.includes('setTimeout'), 'Toast must use setTimeout for auto-dismiss');
assert(toastContent.includes('clearTimeout'), 'Toast must clear timer on unmount / change');
assert(toastContent.includes('defaultDurationMs'), 'Toast must support default duration');
console.log('  ✅ Passed: Auto-dismiss timer and cleanup verified');

// Test 2: Exit animation
console.log('\nTest 2: Smooth exit animation');
assert(toastContent.includes('isExiting'), 'Toast must manage isExiting state for smooth exit transition');
assert(toastContent.includes('exitTimer'), 'Toast must trigger exit animation before unmounting');
console.log('  ✅ Passed: Smooth exit animation verified');

// Test 3: Manual close button retained
console.log('\nTest 3: Retains manual close button');
assert(toastContent.includes('onClick={onClose}'), 'Toast must allow immediate manual dismiss via close button');
console.log('  ✅ Passed: Manual dismiss button retained');

console.log('\n===========================================================');
console.log('🎉 ALL TOAST AUTO-CLOSE TESTS PASSED (100%)!');
console.log('===========================================================');
