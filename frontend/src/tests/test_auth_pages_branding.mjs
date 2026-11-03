import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(__dirname, '../../');

console.log('===========================================================');
console.log('🧪 Starting Auth Pages Branding & Clean Header Tests');
console.log('===========================================================');

let failures = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ Passed: ${name}`);
  } catch (err) {
    console.error(`  ❌ FAILED: ${name}`);
    console.error(`     ${err.message}`);
    failures++;
  }
}

// 1. LoginPage Branding
test('LoginPage uses main name "Vazhikatti", removes "Mumbai", and removes "Your next adventure starts here."', () => {
  const loginCode = fs.readFileSync(path.join(srcDir, 'pages', 'LoginPage.tsx'), 'utf-8');
  assert(loginCode.includes('Vazhikatti'), 'LoginPage displays main brand name "Vazhikatti"');
  assert(!loginCode.includes('RouteWise'), 'LoginPage no longer contains "RouteWise"');
  assert(!loginCode.includes('>Mumbai<') && !loginCode.includes('>mumbi<'), 'LoginPage no longer contains Mumbai badge');
  assert(!loginCode.includes('Your next adventure starts here'), 'LoginPage removed "Your next adventure starts here."');
});

// 2. SignupPage Branding
test('SignupPage uses main name "Vazhikatti" and removes "Mumbai" badge', () => {
  const signupCode = fs.readFileSync(path.join(srcDir, 'pages', 'SignupPage.tsx'), 'utf-8');
  assert(signupCode.includes('Vazhikatti'), 'SignupPage displays main brand name "Vazhikatti"');
  assert(!signupCode.includes('RouteWise'), 'SignupPage no longer contains "RouteWise"');
  assert(!signupCode.includes('>Mumbai<'), 'SignupPage no longer contains Mumbai badge');
});

// 3. ForgotPasswordPage Branding
test('ForgotPasswordPage uses main name "Vazhikatti" and removes "Mumbai" badge', () => {
  const forgotCode = fs.readFileSync(path.join(srcDir, 'pages', 'ForgotPasswordPage.tsx'), 'utf-8');
  assert(forgotCode.includes('Vazhikatti'), 'ForgotPasswordPage displays main brand name "Vazhikatti"');
  assert(!forgotCode.includes('RouteWise'), 'ForgotPasswordPage no longer contains "RouteWise"');
  assert(!forgotCode.includes('>Mumbai<'), 'ForgotPasswordPage no longer contains Mumbai badge');
});

// 4. index.html Title & Meta
test('index.html uses "Vazhikatti - Route Optimizer" as page title', () => {
  const indexHtml = fs.readFileSync(path.join(frontendDir, 'index.html'), 'utf-8');
  assert(indexHtml.includes('<title>Vazhikatti - Route Optimizer</title>'), 'HTML title updated to Vazhikatti');
  assert(!indexHtml.includes('RouteWise - Smart Mumbai Travel Planner'), 'Old title removed from index.html');
});

console.log('===========================================================');
if (failures === 0) {
  console.log('🎉 ALL AUTH BRANDING TESTS PASSED (100%)!');
  console.log('===========================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`);
  console.log('===========================================================');
  process.exit(1);
}
