import pg from 'pg';
import type { UserRecord, TripRecord, SharedTripRecord } from './server.js';

const { Pool } = pg;

// Determine SSL configuration:
// For cloud-hosted PostgreSQL (Supabase, Neon, Render, etc.), SSL with rejectUnauthorized: false is standard.
// For local development on localhost/127.0.0.1, disable SSL.
function getSslConfig(connectionString: string | undefined): boolean | { rejectUnauthorized: boolean } {
  if (!connectionString) return false;
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  if (isLocal) return false;
  return { rejectUnauthorized: false };
}

export const databaseUrl = (process.env.DATABASE_URL || '').trim();

export const pool: pg.Pool | null = databaseUrl
  ? new Pool({
      connectionString: databaseUrl,
      ssl: getSslConfig(databaseUrl),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : null;

if (pool) {
  pool.on('error', (err) => {
    console.error('[RouteWise Postgres] Unexpected pool error on idle client:', err.message);
  });
}

/**
 * Checks whether PostgreSQL is configured and responsive.
 */
export async function isDatabaseConnected(): Promise<boolean> {
  if (!pool) return false;
  try {
    const client = await pool.connect();
    try {
      const res = await client.query('SELECT 1 as connected');
      return Boolean(res?.rows?.[0]?.connected);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.warn('[RouteWise Postgres] Connection check failed:', err.message);
    return false;
  }
}

/**
 * Initializes database tables and indexes idempotently.
 * Safe to run on every server startup — will never drop or reset existing tables or data.
 */
export async function initDatabaseSchema(): Promise<void> {
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Users table
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
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
      CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users (google_id);
    `);

    // 2. Custom Trip Collections table
    await client.query(`
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
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_trip_collections_user_id ON trip_collections (user_id);
      CREATE INDEX IF NOT EXISTS idx_trip_collections_updated_at ON trip_collections (updated_at DESC);
    `);

    // 3. Shared Trips table
    await client.query(`
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
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_shared_trips_created_at ON shared_trips (created_at DESC);
    `);

    // 4. Legacy Saved Trips table (for single active route backward compatibility)
    await client.query(`
      CREATE TABLE IF NOT EXISTS legacy_saved_trips (
        user_key VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(128),
        trip_data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query('COMMIT');
    console.log('[RouteWise Postgres] Database schema verified and ready.');
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('[RouteWise Postgres] Error initializing schema:', err);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Loads all users from PostgreSQL into a Map.
 */
export async function loadUsersFromDb(): Promise<Map<string, UserRecord>> {
  const users = new Map<string, UserRecord>();
  if (!pool) return users;

  try {
    const res = await pool.query(`
      SELECT 
        uid,
        email,
        username,
        display_name as "displayName",
        password_hash as "passwordHash",
        created_at as "createdAt",
        updated_at as "updatedAt",
        google_id as "googleId",
        picture,
        auth_provider as "authProvider",
        email_verified as "emailVerified"
      FROM users
    `);

    for (const row of res.rows) {
      users.set(row.uid, {
        uid: row.uid,
        email: row.email,
        username: row.username,
        displayName: row.displayName || row.username,
        passwordHash: row.passwordHash || '',
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : undefined,
        googleId: row.googleId || undefined,
        picture: row.picture || undefined,
        authProvider: (row.authProvider as any) || 'password',
        emailVerified: Boolean(row.emailVerified),
      });
    }
  } catch (err: any) {
    console.error('[RouteWise Postgres] Failed to load users from DB:', err.message);
  }

  return users;
}

/**
 * Saves or updates a user in PostgreSQL non-destructively.
 */
export async function saveUserToDb(user: UserRecord): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
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
        user.username,
        user.displayName || user.username,
        user.passwordHash || '',
        user.createdAt || new Date().toISOString(),
        user.updatedAt || new Date().toISOString(),
        user.googleId || null,
        user.picture || null,
        user.authProvider || 'password',
        Boolean(user.emailVerified),
      ]
    );
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to save user ${user.uid} to DB:`, err.message);
  }
}

/**
 * Loads all trip collections from PostgreSQL into a Map.
 */
export async function loadTripCollectionsFromDb(): Promise<Map<string, TripRecord>> {
  const collections = new Map<string, TripRecord>();
  if (!pool) return collections;

  try {
    const res = await pool.query(`
      SELECT
        id,
        user_id as "userId",
        name,
        description,
        travel_mode as "travelMode",
        stops,
        is_optimized as "isOptimized",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM trip_collections
    `);

    for (const row of res.rows) {
      collections.set(row.id, {
        id: row.id,
        userId: row.userId,
        name: row.name,
        description: row.description || '',
        travelMode: row.travelMode || 'DRIVING',
        stops: Array.isArray(row.stops) ? row.stops : [],
        isOptimized: Boolean(row.isOptimized),
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error('[RouteWise Postgres] Failed to load trip collections from DB:', err.message);
  }

  return collections;
}

/**
 * Saves or updates a trip collection in PostgreSQL.
 */
export async function saveTripCollectionToDb(trip: TripRecord): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
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
        updated_at = NOW()
      `,
      [
        trip.id,
        trip.userId,
        trip.name,
        trip.description || '',
        trip.travelMode || 'DRIVING',
        JSON.stringify(trip.stops || []),
        Boolean(trip.isOptimized),
        trip.createdAt || new Date().toISOString(),
        trip.updatedAt || new Date().toISOString(),
      ]
    );
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to save trip collection ${trip.id}:`, err.message);
  }
}

/**
 * Deletes a trip collection from PostgreSQL.
 */
export async function deleteTripCollectionFromDb(tripId: string): Promise<void> {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM trip_collections WHERE id = $1', [tripId]);
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to delete trip collection ${tripId}:`, err.message);
  }
}

/**
 * Loads all shared trips from PostgreSQL into a Map.
 */
export async function loadSharedTripsFromDb(): Promise<Map<string, SharedTripRecord>> {
  const shared = new Map<string, SharedTripRecord>();
  if (!pool) return shared;

  try {
    const res = await pool.query(`
      SELECT
        share_id as "shareId",
        title,
        selected_state as "selectedState",
        trip_id as "tripId",
        trip_name as "tripName",
        is_all_trips as "isAllTrips",
        trips,
        stops,
        travel_mode as "travelMode",
        owner_name as "ownerName",
        user_id as "userId",
        total_destinations as "totalDestinations",
        created_at as "createdAt"
      FROM shared_trips
    `);

    for (const row of res.rows) {
      shared.set(row.shareId, {
        shareId: row.shareId,
        title: row.title,
        selectedState: row.selectedState || undefined,
        tripId: row.tripId || undefined,
        tripName: row.tripName || undefined,
        isAllTrips: Boolean(row.isAllTrips),
        trips: row.trips || undefined,
        stops: Array.isArray(row.stops) ? row.stops : [],
        travelMode: row.travelMode || 'DRIVING',
        ownerName: row.ownerName || 'Traveler',
        userId: row.userId || undefined,
        totalDestinations: Number(row.totalDestinations) || 0,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error('[RouteWise Postgres] Failed to load shared trips from DB:', err.message);
  }

  return shared;
}

/**
 * Saves a shared trip to PostgreSQL.
 */
export async function saveSharedTripToDb(trip: SharedTripRecord): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
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
        trip.title,
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
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to save shared trip ${trip.shareId}:`, err.message);
  }
}

/**
 * Loads legacy single saved trips from PostgreSQL.
 */
export async function loadLegacyTripsFromDb(): Promise<Map<string, any>> {
  const legacy = new Map<string, any>();
  if (!pool) return legacy;

  try {
    const res = await pool.query('SELECT user_key, trip_data FROM legacy_saved_trips');
    for (const row of res.rows) {
      legacy.set(row.user_key, row.trip_data);
    }
  } catch (err: any) {
    console.error('[RouteWise Postgres] Failed to load legacy trips from DB:', err.message);
  }

  return legacy;
}

/**
 * Saves a legacy saved trip to PostgreSQL.
 */
export async function saveLegacyTripToDb(userKey: string, tripData: any): Promise<void> {
  if (!pool) return;
  try {
    await pool.query(
      `
      INSERT INTO legacy_saved_trips (user_key, user_id, trip_data, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_key) DO UPDATE SET
        trip_data = EXCLUDED.trip_data,
        updated_at = NOW()
      `,
      [userKey, tripData?.userId || userKey, JSON.stringify(tripData)]
    );
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to save legacy trip for ${userKey}:`, err.message);
  }
}

/**
 * Deletes a legacy saved trip from PostgreSQL.
 */
export async function deleteLegacyTripFromDb(userKey: string): Promise<void> {
  if (!pool) return;
  try {
    await pool.query('DELETE FROM legacy_saved_trips WHERE user_key = $1', [userKey]);
  } catch (err: any) {
    console.error(`[RouteWise Postgres] Failed to delete legacy trip for ${userKey}:`, err.message);
  }
}
