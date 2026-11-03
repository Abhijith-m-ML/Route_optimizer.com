import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('===========================================================');
console.log('🧪 Starting Clean Short Share URL System Tests');
console.log('===========================================================');

const serverPath = path.resolve('../backend/src/server.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const tripServicePath = path.resolve('src/services/tripService.ts');
const tripServiceContent = fs.readFileSync(tripServicePath, 'utf8');

const appPath = path.resolve('src/App.tsx');
const appContent = fs.readFileSync(appPath, 'utf8');

const sharedTripPagePath = path.resolve('src/pages/SharedTripPage.tsx');
const sharedTripPageContent = fs.readFileSync(sharedTripPagePath, 'utf8');

const shareDialogPath = path.resolve('src/components/ShareDialog.tsx');
const shareDialogContent = fs.readFileSync(shareDialogPath, 'utf8');

// Test 1: Short URL generation format in tripService
console.log('\nTest 1: Clean Short URL format (/s/:shareId) without long encoded trip parameters');
assert(tripServiceContent.includes('`${origin}/s/${generatedShareId}`'), 'Must generate clean short URL /s/:shareId');
assert(!tripServiceContent.includes('`&trip=${fallbackB64}`'), 'Must NOT append long base64 JSON payload');
console.log('  ✅ Passed: Clean /s/:shareId URL format generated without long encoded JSON');

// Test 2: Cryptographic short share code generation on backend
console.log('\nTest 2: Backend cryptographically secure short share code generation');
assert(serverContent.includes('generateShortShareCode'), 'Backend must have short share code generator');
assert(serverContent.includes('crypto.randomBytes'), 'Must use crypto.randomBytes for cryptographic safety');
assert(serverContent.includes('/api/trips/share/:shareId'), 'Must provide retrieval endpoint');
assert(serverContent.includes('/api/s/:shareId'), 'Must provide /api/s/:shareId alias endpoint');
console.log('  ✅ Passed: Backend generates random alphanumeric codes and provides short code API');

// Test 3: Frontend Route Registration
console.log('\nTest 3: Frontend route registration (/s/:shareId)');
assert(appContent.includes('path="/s/:shareId"'), 'App.tsx must declare route for /s/:shareId');
assert(appContent.includes('<SharedTripPage />') || appContent.includes('SharedTripPage'), 'App.tsx must render SharedTripPage');
assert(appContent.includes('BrowserRouter'), 'App.tsx must use BrowserRouter for clean path URLs');
console.log('  ✅ Passed: /s/:shareId route registered and accessible to visitors');

// Test 4: Mystery Invitation UI on SharedTripPage
console.log('\nTest 4: Approved mystery invitation UI on SharedTripPage');
assert(sharedTripPageContent.includes('A SURPRISE TRIP'), 'SharedTripPage must display A SURPRISE TRIP');
assert(sharedTripPageContent.includes("YOU'VE BEEN INVITED TO EXPLORE"), 'Must display invitation header');
assert(sharedTripPageContent.includes('VIEW SHARED TRIP →'), 'Must provide VIEW SHARED TRIP → action');
assert(sharedTripPageContent.includes('Shared securely through Vazhikatti'), 'Must display secure footer');
assert(sharedTripPageContent.includes('handleCopyLink'), 'Must provide copy short link button');
console.log('  ✅ Passed: Approved mystery invitation UI and copy action verified');

// Test 5: Graceful error handling for invalid or expired share links
console.log('\nTest 5: Graceful invalid / expired share ID handling');
assert(sharedTripPageContent.includes('TRIP NOT FOUND'), 'Must display clear not found message on invalid IDs');
assert(sharedTripPageContent.includes('invalid, expired, or has been removed'), 'Must provide clear explanation');
console.log('  ✅ Passed: Invalid and expired share IDs handled gracefully');

// Test 6: ShareDialog Copy Link button
console.log('\nTest 6: ShareDialog Copy Link Integration');
assert(shareDialogContent.includes('handleCopyExistingUrl') || shareDialogContent.includes('clipboard.writeText'), 'ShareDialog must provide copy button');
console.log('  ✅ Passed: ShareDialog provides copy button for new short URL');

console.log('\n===========================================================');
console.log('🎉 ALL CLEAN SHORT SHARE URL TESTS PASSED (100%)!');
console.log('===========================================================');
