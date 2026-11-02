import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const databaseUrl = (process.env.DATABASE_URL || process.argv[2] || '').trim();

if (!databaseUrl) {
  console.error('\n❌ ERROR: DATABASE_URL is required to run the migration.');
  console.error('Usage:');
  console.error('  node backend/migrate_to_postgres.mjs "postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"');
  console.error('Or set DATABASE_URL in your backend/.env file.\n');
  process.exit(1);
}

const isLocal = databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1');
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

// Paths to JSON data files
const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function readJsonSafe(filePath) {
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.warn(`[Migration] Warning reading ${filePath}:`, e.message);
    }
  }
  return null;
}

// Consolidate data from primary, seed, and backup files to ensure NO record is missed
function collectAllUsers() {
  const merged = new Map();

  const sources = [
    path.join(__dirname, 'users_data.seed.json'),
    path.join(BACKUP_DIR, 'users_backup_latest.json'),
    path.join(DATA_DIR, 'users_data.json'),
    path.join(__dirname, 'users_data.json'),
  ];

  for (const src of sources) {
    const data = readJsonSafe(src);
    if (data && typeof data === 'object') {
      for (const [uid, user] of Object.entries(data)) {
        if (user && user.email) {
          merged.set(uid, user);
        }
      }
    }
  }

  return merged;
}

function collectAllCollections() {
  const merged = new Map();

  const sources = [
    path.join(__dirname, 'trips_collections.seed.json'),
    path.join(BACKUP_DIR, 'collections_backup_latest.json'),
    path.join(DATA_DIR, 'trips_collections.json'),
    path.join(__dirname, 'trips_collections.json'),
  ];

  for (const src of sources) {
    const data = readJsonSafe(src);
    if (data && typeof data === 'object') {
      for (const [id, trip] of Object.entries(data)) {
        if (trip && trip.name) {
          merged.set(id, trip);
        }
      }
    }
  }

  return merged;
}

function collectAllSharedTrips() {
  const merged = new Map();

  const sources = [
    path.join(__dirname, 'shared_trips.seed.json'),
    path.join(BACKUP_DIR, 'shared_backup_latest.json'),
    path.join(DATA_DIR, 'shared_trips.json'),
    path.join(__dirname, 'shared_trips.json'),
  ];

  for (const src of sources) {
    const data = readJsonSafe(src);
    if (data && typeof data === 'object') {
      for (const [shareId, trip] of Object.entries(data)) {
        if (trip && trip.shareId) {
          merged.set(shareId, trip);
        }
      }
    }
  }

  return merged;
}

function collectAllLegacyTrips() {
  const merged = new Map();

  const sources = [
    path.join(DATA_DIR, 'trips_data.json'),
    path.join(__dirname, 'trips_data.json'),
  ];

  for (const src of sources) {
    const data = readJsonSafe(src);
    if (data && typeof data === 'object') {
      for (const [key, trip] of Object.entries(data)) {
        if (trip) {
          merged.set(key, trip);
        }
      }
    }
  }

  return merged;
}

async function runMigration() {
  console.log('====================================================');
  console.log('🛡️ RouteWise Safe Non-Destructive PostgreSQL Migration');
  console.log('====================================================');

  const client = await pool.connect();
  try {
    console.log('✓ Connected to PostgreSQL target successfully.');

    // Step 1: Ensure Schema Exists
    console.log('\n[1/5] Ensuring database schema and tables exist...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid VARCHAR(128) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(128) UNIQUE NOT NULL,
        display_name VARCHAR(255),
        password_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        google_id VARCHAR(128),
        picture TEXT,
        auth_provider VARCHAR(32) DEFAULT 'password',
        email_verified BOOLEAN DEFAULT FALSE
      );
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);

      CREATE TABLE IF NOT EXISTS trip_collections (
        id VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        travel_mode VARCHAR(32) DEFAULT 'DRIVING',
        stops JSONB NOT NULL DEFAULT '[]'::jsonb,
        is_optimized BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_trip_collections_user_id ON trip_collections (user_id);
      CREATE INDEX IF NOT EXISTS idx_trip_collections_updated_at ON trip_collections (updated_at DESC);

      CREATE TABLE IF NOT EXISTS shared_trips (
        share_id VARCHAR(128) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        selected_state VARCHAR(128),
        trip_id VARCHAR(128),
        trip_name VARCHAR(255),
        is_all_trips BOOLEAN DEFAULT FALSE,
        trips JSONB,
        stops JSONB NOT NULL DEFAULT '[]'::jsonb,
        travel_mode VARCHAR(32) DEFAULT 'DRIVING',
        owner_name VARCHAR(255) DEFAULT 'Traveler',
        user_id VARCHAR(128),
        total_destinations INT DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_shared_trips_created_at ON shared_trips (created_at DESC);

      CREATE TABLE IF NOT EXISTS legacy_saved_trips (
        user_key VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128),
        trip_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('✓ Tables & indexes verified.');

    // Step 2: Migrate Users
    console.log('\n[2/5] Migrating Users...');
    const users = collectAllUsers();
    console.log(`  Found ${users.size} user records across JSON storage and backups.`);

    let usersImported = 0;
    let usersSkipped = 0;
    for (const user of users.values()) {
      if (!user.uid || !user.email) {
        usersSkipped++;
        continue;
      }
      try {
        await client.query(
          `
          INSERT INTO users (
            uid, email, username, display_name, password_hash,
            created_at, updated_at, google_id, picture, auth_provider, email_verified
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (uid) DO UPDATE SET
            email = EXCLUDED.email,
            username = EXCLUDED.username,
            display_name = EXCLUDED.display_name,
            password_hash = CASE WHEN EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
            updated_at = NOW(),
            google_id = COALESCE(EXCLUDED.google_id, users.google_id),
            picture = COALESCE(EXCLUDED.picture, users.picture),
            auth_provider = EXCLUDED.auth_provider,
            email_verified = EXCLUDED.email_verified
          `,
          [
            user.uid,
            user.email.toLowerCase().trim(),
            user.username || user.email.split('@')[0],
            user.displayName || user.username || user.email.split('@')[0],
            user.passwordHash || '',
            user.createdAt || new Date().toISOString(),
            user.updatedAt || new Date().toISOString(),
            user.googleId || null,
            user.picture || null,
            user.authProvider || 'password',
            Boolean(user.emailVerified),
          ]
        );
        usersImported++;
      } catch (e) {
        // If there's an email/username uniqueness conflict with different UID, log and continue
        console.warn(`  [Notice] Could not insert user ${user.email} (${user.uid}):`, e.message);
        usersSkipped++;
      }
    }
    console.log(`✓ Users Migration Complete: ${usersImported} upserted, ${usersSkipped} skipped.`);

    // Step 3: Migrate Trip Collections
    console.log('\n[3/5] Migrating Trip Collections...');
    const collections = collectAllCollections();
    console.log(`  Found ${collections.size} trip collections across JSON storage.`);

    let collectionsImported = 0;
    for (const trip of collections.values()) {
      try {
        await client.query(
          `
          INSERT INTO trip_collections (
            id, user_id, name, description, travel_mode, stops, is_optimized, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            travel_mode = EXCLUDED.travel_mode,
            stops = EXCLUDED.stops,
            is_optimized = EXCLUDED.is_optimized,
            updated_at = EXCLUDED.updated_at
          `,
          [
            trip.id,
            trip.userId || 'default',
            trip.name || 'Untitled Trip',
            trip.description || '',
            trip.travelMode || 'DRIVING',
            JSON.stringify(trip.stops || []),
            Boolean(trip.isOptimized),
            trip.createdAt || new Date().toISOString(),
            trip.updatedAt || new Date().toISOString(),
          ]
        );
        collectionsImported++;
      } catch (e) {
        console.warn(`  [Notice] Could not insert trip ${trip.id}:`, e.message);
      }
    }
    console.log(`✓ Trip Collections Migration Complete: ${collectionsImported} upserted.`);

    // Step 4: Migrate Shared Trips
    console.log('\n[4/5] Migrating Shared Trips...');
    const sharedTrips = collectAllSharedTrips();
    console.log(`  Found ${sharedTrips.size} shared trips across JSON storage.`);

    let sharedImported = 0;
    for (const trip of sharedTrips.values()) {
      try {
        await client.query(
          `
          INSERT INTO shared_trips (
            share_id, title, selected_state, trip_id, trip_name, is_all_trips,
            trips, stops, travel_mode, owner_name, user_id, total_destinations, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (share_id) DO UPDATE SET
            title = EXCLUDED.title,
            selected_state = EXCLUDED.selected_state,
            trip_id = EXCLUDED.trip_id,
            trip_name = EXCLUDED.trip_name,
            is_all_trips = EXCLUDED.is_all_trips,
            trips = EXCLUDED.trips,
            stops = EXCLUDED.stops,
            travel_mode = EXCLUDED.travel_mode,
            owner_name = EXCLUDED.owner_name,
            user_id = EXCLUDED.user_id,
            total_destinations = EXCLUDED.total_destinations
          `,
          [
            trip.shareId,
            trip.title || 'Shared Trip',
            trip.selectedState || null,
            trip.tripId || null,
            trip.tripName || null,
            Boolean(trip.isAllTrips),
            trip.trips ? JSON.stringify(trip.trips) : null,
            JSON.stringify(trip.stops || []),
            trip.travelMode || 'DRIVING',
            trip.ownerName || 'Traveler',
            trip.userId || null,
            Number(trip.totalDestinations) || 0,
            trip.createdAt || new Date().toISOString(),
          ]
        );
        sharedImported++;
      } catch (e) {
        console.warn(`  [Notice] Could not insert shared trip ${trip.shareId}:`, e.message);
      }
    }
    console.log(`✓ Shared Trips Migration Complete: ${sharedImported} upserted.`);

    // Step 5: Migrate Legacy Saved Trips
    console.log('\n[5/5] Migrating Legacy Saved Trips...');
    const legacyTrips = collectAllLegacyTrips();
    let legacyImported = 0;
    for (const [key, trip] of legacyTrips.entries()) {
      try {
        await client.query(
          `
          INSERT INTO legacy_saved_trips (user_key, user_id, trip_data, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_key) DO UPDATE SET
            trip_data = EXCLUDED.trip_data,
            updated_at = NOW()
          `,
          [key, trip?.userId || key, JSON.stringify(trip)]
        );
        legacyImported++;
      } catch (e) {
        console.warn(`  [Notice] Could not insert legacy trip ${key}:`, e.message);
      }
    }
    console.log(`✓ Legacy Trips Migration Complete: ${legacyImported} upserted.`);

    // Summary Verification Counts from Database
    const usersCountRes = await client.query('SELECT COUNT(*) FROM users');
    const collectionsCountRes = await client.query('SELECT COUNT(*) FROM trip_collections');
    const sharedCountRes = await client.query('SELECT COUNT(*) FROM shared_trips');
    const legacyCountRes = await client.query('SELECT COUNT(*) FROM legacy_saved_trips');

    console.log('\n====================================================');
    console.log('🎉 PostgreSQL Migration Complete & Verified!');
    console.log('====================================================');
    console.log(`  Users in PostgreSQL:            ${usersCountRes.rows[0].count}`);
    console.log(`  Trip Collections in PostgreSQL: ${collectionsCountRes.rows[0].count}`);
    console.log(`  Shared Trips in PostgreSQL:     ${sharedCountRes.rows[0].count}`);
    console.log(`  Legacy Trips in PostgreSQL:     ${legacyCountRes.rows[0].count}`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Migration Failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();

