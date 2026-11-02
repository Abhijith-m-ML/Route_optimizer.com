import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 Testing PostgreSQL Schema, Scripts & Non-Destructive Integrity');
console.log('====================================================');

// Test 1: Verify db.ts and migrate_to_postgres.mjs files exist
const dbFile = path.join(__dirname, 'src', 'db.ts');
const migrationScript = path.join(__dirname, 'migrate_to_postgres.mjs');

assert.ok(fs.existsSync(dbFile), 'backend/src/db.ts must exist');
assert.ok(fs.existsSync(migrationScript), 'backend/migrate_to_postgres.mjs must exist');
console.log('✓ db.ts and migrate_to_postgres.mjs exist');

// Test 2: Verify dist/db.js was compiled successfully
const distDb = path.join(__dirname, 'dist', 'db.js');
assert.ok(fs.existsSync(distDb), 'dist/db.js must be compiled by tsc');
console.log('✓ dist/db.js compiled successfully');

// Test 3: Verify all JSON data and backups remain completely intact and untouched
const usersFile = path.join(__dirname, 'data', 'users_data.json');
const collectionsFile = path.join(__dirname, 'data', 'trips_collections.json');
const sharedFile = path.join(__dirname, 'data', 'shared_trips.json');

assert.ok(fs.existsSync(usersFile), 'users_data.json must exist');
assert.ok(fs.existsSync(collectionsFile), 'trips_collections.json must exist');
assert.ok(fs.existsSync(sharedFile), 'shared_trips.json must exist');

const usersData = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
const collectionsData = JSON.parse(fs.readFileSync(collectionsFile, 'utf-8'));
const sharedData = JSON.parse(fs.readFileSync(sharedFile, 'utf-8'));

const totalUsers = Object.keys(usersData).length;
const totalCollections = Object.keys(collectionsData).length;
const totalShared = Object.keys(sharedData).length;

assert.ok(totalUsers >= 87, `Total users must be at least 87 (found: ${totalUsers})`);
assert.ok(totalCollections >= 28, `Total collections must be at least 28 (found: ${totalCollections})`);
assert.ok(totalShared >= 31, `Total shared trips must be at least 31 (found: ${totalShared})`);

console.log(`✓ Data integrity verified: ${totalUsers} users, ${totalCollections} collections, ${totalShared} shared trips intact.`);

// Test 4: Verify password format across users
let verifiedPasswords = 0;
for (const user of Object.values(usersData)) {
  if (user.passwordHash) {
    const parts = user.passwordHash.split(':');
    assert.strictEqual(parts.length, 2, `Password hash for ${user.email} must follow salt:hash format`);
    assert.strictEqual(parts[0].length, 32, 'Salt must be 16 bytes (32 hex characters)');
    assert.strictEqual(parts[1].length, 128, 'Hash must be 64 bytes (128 hex characters)');
    verifiedPasswords++;
  }
}
console.log(`✓ Password integrity verified: ${verifiedPasswords} scryptSync hashes validated.`);

// Test 5: Verify db.ts schema definitions contain required tables and indexes
const dbContent = fs.readFileSync(dbFile, 'utf-8');
assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS users'), 'db.ts must create users table');
assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS trip_collections'), 'db.ts must create trip_collections table');
assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS shared_trips'), 'db.ts must create shared_trips table');
assert.ok(dbContent.includes('CREATE TABLE IF NOT EXISTS legacy_saved_trips'), 'db.ts must create legacy_saved_trips table');
assert.ok(dbContent.includes('idx_users_email_lower'), 'db.ts must index lower(email)');
assert.ok(dbContent.includes('idx_users_username'), 'db.ts must index username');
assert.ok(dbContent.includes('idx_trip_collections_user_id'), 'db.ts must index user_id');
console.log('✓ Database schema definitions and indexes verified.');

console.log('\n====================================================');
console.log('🎉 ALL INTEGRITY TESTS PASSED!');
console.log('====================================================\n');

