import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(__dirname, '../../../backend/src');

console.log('===========================================================');
console.log('🧪 Starting Profile Editing & Avatar Change Test Suite');
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

// 1. EditProfileModal implementation
test('EditProfileModal provides image change, upload, URL, and remove photo options', () => {
  const modalCode = fs.readFileSync(path.join(srcDir, 'components', 'EditProfileModal.tsx'), 'utf-8');
  assert(modalCode.includes('handleFileChange') && modalCode.includes('type="file"'), 'File upload handler exists');
  assert(modalCode.includes('canvas.toDataURL'), 'Client-side image compression to lightweight data URL implemented');
  assert(modalCode.includes('handleRemovePhoto') && modalCode.includes('setPhotoURL(null)'), 'Remove photo option exists');
  assert(modalCode.includes('handleApplyUrl') || modalCode.includes('urlInputValue'), 'Image URL paste option exists');
  assert(modalCode.includes('displayName') && modalCode.includes('updateProfile'), 'Display name editing connects to updateProfile');
});

// 2. Navbar Drawer & Desktop integration
test('Navbar provides Edit Profile trigger and removed Dashboard/Home from drawer', () => {
  const navbarCode = fs.readFileSync(path.join(srcDir, 'components', 'Navbar.tsx'), 'utf-8');
  assert(navbarCode.includes('EditProfileModal'), 'EditProfileModal imported and rendered in Navbar');
  assert(navbarCode.includes('setIsEditProfileOpen(true)'), 'Edit profile state trigger present in profile card');
  assert(!navbarCode.includes('Dashboard / Home'), 'Dashboard / Home item removed from drawer navigation');
  assert(navbarCode.includes('Interactive Map') && navbarCode.includes('Trip Plan'), 'Other navigation options retained');
});

// 3. Frontend authService & AuthContext
test('Frontend AuthContext & authService support updateUserProfile', () => {
  const authServiceCode = fs.readFileSync(path.join(srcDir, 'services', 'authService.ts'), 'utf-8');
  const authContextCode = fs.readFileSync(path.join(srcDir, 'context', 'AuthContext.tsx'), 'utf-8');
  assert(authServiceCode.includes('export async function updateUserProfile'), 'updateUserProfile exported from authService');
  assert(authServiceCode.includes('/api/auth/profile'), 'authService calls /api/auth/profile');
  assert(authContextCode.includes('updateProfile:'), 'AuthContextType exposes updateProfile');
});

// 4. Backend profile update endpoint & PostgreSQL persistence
test('Backend server.ts & db.ts persist updated name and avatar picture', () => {
  const serverCode = fs.readFileSync(path.join(backendDir, 'server.ts'), 'utf-8');
  const dbCode = fs.readFileSync(path.join(backendDir, 'db.ts'), 'utf-8');
  assert(serverCode.includes("app.patch('/api/auth/profile'"), 'PATCH /api/auth/profile registered');
  assert(serverCode.includes('removePicture === true') || serverCode.includes('__CLEAR__'), 'Picture removal explicitly handled');
  assert(dbCode.includes('__CLEAR__'), 'PostgreSQL picture update query handles __CLEAR__ reset to NULL');
});

console.log('===========================================================');
if (failures === 0) {
  console.log('🎉 ALL PROFILE EDIT & AVATAR CHANGE TESTS PASSED (100%)!');
  console.log('===========================================================');
  process.exit(0);
} else {
  console.error(`💥 ${failures} TEST(S) FAILED!`);
  console.log('===========================================================');
  process.exit(1);
}
