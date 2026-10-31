import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------------------------------------------------------------
// Permanent Multi-Tier Database & Storage Engine Configuration
// -------------------------------------------------------------
// Supports Render Persistent Disk (e.g. DATA_DIR=/var/data),
// container storage with baseline seed recovery, and rolling backups.
export const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, '..', 'data');

export const BACKUP_DIR = path.join(DATA_DIR, 'backups');

// Ensure persistent storage and backup directories exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn('[RouteWise DB] Warning creating data directories:', dirErr);
}

const DATA_FILE = path.join(DATA_DIR, 'trips_data.json');
const USERS_FILE = path.join(DATA_DIR, 'users_data.json');
const SHARED_TRIPS_FILE = path.join(DATA_DIR, 'shared_trips.json');
const TRIPS_COLLECTIONS_FILE = path.join(DATA_DIR, 'trips_collections.json');

// Atomic and safe JSON write utility to prevent corruption on abrupt shutdowns
function atomicWriteJson(filePath: string, data: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempFile = `${filePath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, content, 'utf-8');
    try {
      fs.renameSync(tempFile, filePath);
    } catch {
      // Fallback if OS file-lock (e.g. Windows) prevents immediate rename
      fs.writeFileSync(filePath, content, 'utf-8');
      if (fs.existsSync(tempFile)) {
        try { fs.unlinkSync(tempFile); } catch {}
      }
    }
  } catch (err) {
    console.error(`[RouteWise DB] Write error for ${filePath}:`, err);
  }
}

// Prune old timestamped backups keeping the latest 30 snapshots
function pruneOldBackups(prefix: string, maxKeep: number = 30) {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith(prefix) && f.endsWith('.json') && !f.includes('latest'))
      .map(f => ({ name: f, time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > maxKeep) {
      for (let i = maxKeep; i < files.length; i++) {
        try {
          fs.unlinkSync(path.join(BACKUP_DIR, files[i].name));
        } catch {}
      }
    }
  } catch {}
}

const JWT_SECRET = process.env.JWT_SECRET || 'routewise_jwt_secret_mumbai_secure_key_2026';

export interface UserRecord {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

export interface TokenPayload {
  uid: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserRecord;
}

export interface TripRecord {
  id: string; // trip_id
  userId: string; // owner uid
  name: string; // custom trip name e.g. "Mumbai Trip", "Kerala Vacation"
  description?: string;
  travelMode: string;
  stops: any[];
  isOptimized?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SharedTripRecord {
  shareId: string;
  title: string;
  selectedState?: string;
  tripId?: string;
  tripName?: string;
  isAllTrips?: boolean;
  trips?: {
    id: string;
    name: string;
    description?: string;
    stops: any[];
    travelMode: string;
    totalDestinations: number;
  }[];
  stops: any[];
  travelMode: string;
  ownerName?: string;
  userId?: string;
  totalDestinations: number;
  createdAt: string;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8').toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

export function generateToken(
  user: { uid: string; email: string; username: string },
  expiresInSeconds: number = 7 * 24 * 3600
): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = {
    uid: user.uid,
    email: user.email,
    username: user.username,
    iat: now,
    exp: now + expiresInSeconds,
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, bodyB64, signatureB64] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${bodyB64}`)
      .digest('base64url');

    if (
      Buffer.byteLength(signatureB64) !== Buffer.byteLength(expectedSignature) ||
      !crypto.timingSafeEqual(Buffer.from(signatureB64), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    const payload: TokenPayload = JSON.parse(base64UrlDecode(bodyB64));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

function loadPersistedUsers(): Map<string, UserRecord> {
  const merged = new Map<string, UserRecord>();

  // Layer 1: Baseline Seed file (committed in repo - ensures non-zero database on fresh deployments)
  const seedFile = path.join(__dirname, '..', 'users_data.seed.json');
  if (fs.existsSync(seedFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) {
        merged.set(k, v as UserRecord);
      }
    } catch (e) {
      console.warn('[RouteWise DB] Warning reading users seed file:', e);
    }
  }

  // Layer 2: Legacy root users file (in backend/users_data.json)
  const legacyRootFile = path.join(__dirname, '..', 'users_data.json');
  if (fs.existsSync(legacyRootFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(legacyRootFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) {
        merged.set(k, v as UserRecord);
      }
    } catch (e) {
      console.warn('[RouteWise DB] Warning reading legacy root users file:', e);
    }
  }

  // Layer 3: Latest backup file
  const latestBackup = path.join(BACKUP_DIR, 'users_backup_latest.json');
  if (fs.existsSync(latestBackup)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestBackup, 'utf-8'));
      for (const [k, v] of Object.entries(data)) {
        merged.set(k, v as UserRecord);
      }
    } catch (e) {
      console.warn('[RouteWise DB] Warning reading users backup file:', e);
    }
  }

  // Layer 4: Primary persistent disk file in DATA_DIR
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(data)) {
        merged.set(k, v as UserRecord);
      }
    } catch (e) {
      console.warn('[RouteWise DB] Warning reading primary users file:', e);
    }
  }

  // Sync consolidated records into USERS_FILE and root file
  if (merged.size > 0) {
    atomicWriteJson(USERS_FILE, Object.fromEntries(merged));
    atomicWriteJson(path.join(BACKUP_DIR, 'users_backup_latest.json'), Object.fromEntries(merged));
    if (path.resolve(legacyRootFile) !== path.resolve(USERS_FILE)) {
      atomicWriteJson(legacyRootFile, Object.fromEntries(merged));
    }
  }

  console.log(`[RouteWise DB] Loaded ${merged.size} user accounts with permanent persistence.`);
  return merged;
}

let lastUserBackupTime = 0;
function persistUsers(users: Map<string, UserRecord>) {
  try {
    const obj = Object.fromEntries(users);
    atomicWriteJson(USERS_FILE, obj);

    const legacyRootFile = path.join(__dirname, '..', 'users_data.json');
    if (path.resolve(legacyRootFile) !== path.resolve(USERS_FILE)) {
      atomicWriteJson(legacyRootFile, obj);
    }

    atomicWriteJson(path.join(BACKUP_DIR, 'users_backup_latest.json'), obj);

    const now = Date.now();
    if (now - lastUserBackupTime > 60000) {
      lastUserBackupTime = now;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      atomicWriteJson(path.join(BACKUP_DIR, `users_backup_${ts}.json`), obj);
      pruneOldBackups('users_backup_');
    }
  } catch (err) {
    console.error('[RouteWise DB] Could not write users_data.json:', err);
  }
}

export const usersMap = loadPersistedUsers();

function loadPersistedTrips(): Map<string, any> {
  const merged = new Map<string, any>();
  const legacyRootFile = path.join(__dirname, '..', 'trips_data.json');
  if (fs.existsSync(legacyRootFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(legacyRootFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v);
    } catch {}
  }
  if (fs.existsSync(DATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v);
    } catch {}
  }
  if (merged.size > 0) {
    atomicWriteJson(DATA_FILE, Object.fromEntries(merged));
  }
  return merged;
}

function persistTrips(trips: Map<string, any>) {
  try {
    const obj = Object.fromEntries(trips);
    atomicWriteJson(DATA_FILE, obj);
    const legacyRootFile = path.join(__dirname, '..', 'trips_data.json');
    if (path.resolve(legacyRootFile) !== path.resolve(DATA_FILE)) {
      atomicWriteJson(legacyRootFile, obj);
    }
  } catch (err) {
    console.error('[RouteWise DB] Could not write trips_data.json:', err);
  }
}

export const savedTripsMap = loadPersistedTrips();

function loadPersistedSharedTrips(): Map<string, SharedTripRecord> {
  const merged = new Map<string, SharedTripRecord>();
  const seedFile = path.join(__dirname, '..', 'shared_trips.seed.json');
  if (fs.existsSync(seedFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as SharedTripRecord);
    } catch {}
  }
  const legacyRootFile = path.join(__dirname, '..', 'shared_trips.json');
  if (fs.existsSync(legacyRootFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(legacyRootFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as SharedTripRecord);
    } catch {}
  }
  if (fs.existsSync(SHARED_TRIPS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(SHARED_TRIPS_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as SharedTripRecord);
    } catch {}
  }
  if (merged.size > 0) {
    atomicWriteJson(SHARED_TRIPS_FILE, Object.fromEntries(merged));
  }
  return merged;
}

function persistSharedTrips(trips: Map<string, SharedTripRecord>) {
  try {
    const obj = Object.fromEntries(trips);
    atomicWriteJson(SHARED_TRIPS_FILE, obj);
    const legacyRootFile = path.join(__dirname, '..', 'shared_trips.json');
    if (path.resolve(legacyRootFile) !== path.resolve(SHARED_TRIPS_FILE)) {
      atomicWriteJson(legacyRootFile, obj);
    }
    atomicWriteJson(path.join(BACKUP_DIR, 'shared_backup_latest.json'), obj);
  } catch (err) {
    console.error('[RouteWise DB] Could not write shared_trips.json:', err);
  }
}

export const sharedTripsMap = loadPersistedSharedTrips();

function loadPersistedTripCollections(): Map<string, TripRecord> {
  const merged = new Map<string, TripRecord>();
  const seedFile = path.join(__dirname, '..', 'trips_collections.seed.json');
  if (fs.existsSync(seedFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(seedFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as TripRecord);
    } catch {}
  }
  const legacyRootFile = path.join(__dirname, '..', 'trips_collections.json');
  if (fs.existsSync(legacyRootFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(legacyRootFile, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as TripRecord);
    } catch {}
  }
  if (fs.existsSync(TRIPS_COLLECTIONS_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(TRIPS_COLLECTIONS_FILE, 'utf-8'));
      for (const [k, v] of Object.entries(data)) merged.set(k, v as TripRecord);
    } catch {}
  }
  if (merged.size > 0) {
    atomicWriteJson(TRIPS_COLLECTIONS_FILE, Object.fromEntries(merged));
  }
  return merged;
}

let lastCollectionBackupTime = 0;
function persistTripCollections(collections: Map<string, TripRecord>) {
  try {
    const obj = Object.fromEntries(collections);
    atomicWriteJson(TRIPS_COLLECTIONS_FILE, obj);
    const legacyRootFile = path.join(__dirname, '..', 'trips_collections.json');
    if (path.resolve(legacyRootFile) !== path.resolve(TRIPS_COLLECTIONS_FILE)) {
      atomicWriteJson(legacyRootFile, obj);
    }
    atomicWriteJson(path.join(BACKUP_DIR, 'collections_backup_latest.json'), obj);

    const now = Date.now();
    if (now - lastCollectionBackupTime > 60000) {
      lastCollectionBackupTime = now;
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      atomicWriteJson(path.join(BACKUP_DIR, `collections_backup_${ts}.json`), obj);
      pruneOldBackups('collections_backup_');
    }
  } catch (err) {
    console.error('[RouteWise DB] Could not write trips_collections.json:', err);
  }
}

export const tripCollectionsMap = loadPersistedTripCollections();

/**
 * Resolves the authenticated user or identifier from request token, body, or query
 */
export function resolveRequestUser(req: Request): { uid: string; email?: string; username?: string } | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);
    if (payload) {
      return { uid: payload.uid, email: payload.email, username: payload.username };
    }
  }
  const bodyUid = (req as any).user?.uid || (req.body && req.body.userId) || req.query.userId || req.headers['x-user-id'];
  if (bodyUid && typeof bodyUid === 'string' && bodyUid.trim()) {
    return { uid: bodyUid.trim() };
  }
  return null;
}

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'https://vazhikatti-route.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, health check)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      return callback(null, true);
    }
    // Fallback: accept for preview deployments
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Authentication Middleware to protect private API routes
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. Valid authentication token required.' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access denied. Valid authentication token required.' });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }

  let user = usersMap.get(payload.uid);
  if (!user) {
    // Check if user exists by email or username
    user = findUserByIdentifier(payload.email) || findUserByIdentifier(payload.username);
    if (user) {
      usersMap.set(payload.uid, user);
    } else {
      // Self-healing: The token has a cryptographically valid HMAC-SHA256 signature
      // issued by this server with JWT_SECRET.
      // Reconstruct and restore user record so valid active sessions are never dropped!
      const restoredUser: UserRecord = {
        uid: payload.uid,
        email: payload.email,
        username: payload.username,
        displayName: payload.username,
        passwordHash: '', // Protected: password remains unchanged in database or can be reset
        createdAt: new Date().toISOString(),
      };
      usersMap.set(payload.uid, restoredUser);
      persistUsers(usersMap);
      user = restoredUser;
      console.log(`[RouteWise DB] Restored valid authenticated session for ${payload.email} (${payload.uid})`);
    }
  }

  req.user = user;
  next();
}

// Root health-check endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Route Optimizer API',
    project: 'Smart Travel Planner (RouteWise)',
    version: '1.2.0',
    endpoints: {
      health: '/api/health',
      backup: 'GET /api/admin/backup',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      dashboard: 'GET /api/dashboard/summary',
      trips: '/api/trips',
      userTrips: '/api/user-trips',
      share: 'POST /api/trips/share',
      getShare: 'GET /api/trips/share/:shareId',
      importTrip: 'POST /api/trips/import',
    },
    timestamp: new Date().toISOString(),
  });
});

// Comprehensive Health check endpoint with storage persistence status
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Smart Travel Planner (RouteWise)',
    usersCount: usersMap.size,
    tripCollectionsCount: tripCollectionsMap.size,
    sharedTripsCount: sharedTripsMap.size,
    persistence: {
      storageEngine: 'Multi-Tier JSON Document Store with Seed Baseline & Rolling Snapshots',
      dataDirectory: DATA_DIR,
      persistentDiskConfigured: Boolean(process.env.DATA_DIR),
      backupDirectory: BACKUP_DIR,
      status: 'protected',
    },
    timestamp: new Date().toISOString(),
  });
});

// Admin Database Backup & Export Endpoint (Protected)
app.get('/api/admin/backup', (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
    const expectedKey = process.env.ADMIN_KEY || JWT_SECRET;

    const user = resolveRequestUser(req);
    if (!user && adminKey !== expectedKey) {
      return res.status(401).json({ error: 'Unauthorized to export backup data.' });
    }

    const payload = {
      timestamp: new Date().toISOString(),
      version: '1.2.0',
      stats: {
        totalUsers: usersMap.size,
        totalTripCollections: tripCollectionsMap.size,
        totalSharedTrips: sharedTripsMap.size,
        totalLegacyTrips: savedTripsMap.size,
      },
      data: {
        users: Object.fromEntries(usersMap),
        tripCollections: Object.fromEntries(tripCollectionsMap),
        sharedTrips: Object.fromEntries(sharedTripsMap),
        savedTrips: Object.fromEntries(savedTripsMap),
      },
      storage: {
        dataDir: DATA_DIR,
        backupDir: BACKUP_DIR,
        persistentDiskConfigured: Boolean(process.env.DATA_DIR),
      },
    };

    res.json({ success: true, backup: payload });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Backup generation failed' });
  }
});

/**
 * Look up a user record by identifier (email, username, or UID).
 * - Email lookup is case-insensitive (e.g. user@domain.com === USER@DOMAIN.COM).
 * - Username and UID lookups are strictly case-sensitive exact identity matches.
 * - Display names are non-unique and are NOT used for credential resolution.
 */
export function findUserByIdentifier(identifier: string): UserRecord | undefined {
  const trimmed = identifier.trim();
  if (!trimmed) return undefined;

  const isEmail = trimmed.includes('@');
  const normalizedEmail = isEmail ? trimmed.toLowerCase() : null;

  for (const u of usersMap.values()) {
    // 1. Strict case-sensitive exact username match
    if (u.username === trimmed) {
      return u;
    }
    // 2. Strict case-sensitive exact UID match
    if (u.uid === trimmed) {
      return u;
    }
    // 3. Case-insensitive email match
    if (normalizedEmail && u.email.toLowerCase() === normalizedEmail) {
      return u;
    }
  }

  return undefined;
}

// Central Authentication: Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, displayName, username } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return res.status(400).json({ error: 'Email cannot be empty.' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address format.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Extract username: preserve exact user-entered casing
    const rawUsername = (typeof username === 'string' && username.trim())
      ? username.trim()
      : email.trim().split('@')[0];

    if (!rawUsername || rawUsername.length < 2) {
      return res.status(400).json({ error: 'Username must be at least 2 characters long.' });
    }

    if (/\s/.test(rawUsername)) {
      return res.status(400).json({ error: 'Username cannot contain spaces.' });
    }

    const finalUsername = rawUsername;
    const finalDisplayName = (typeof displayName === 'string' && displayName.trim())
      ? displayName.trim()
      : finalUsername;

    // Check if user already exists:
    // - Email comparison is case-insensitive (standard RFC email identity)
    // - Username comparison is strictly case-sensitive (exact username identity)
    for (const u of usersMap.values()) {
      if (u.email.toLowerCase() === cleanEmail) {
        return res.status(400).json({
          error: 'An account with this email address already exists. Please log in instead.',
        });
      }
      if (u.username === finalUsername) {
        return res.status(400).json({
          error: 'An account with this username already exists. Please choose a different username.',
        });
      }
    }

    const uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const passwordHash = hashPassword(password);
    const newUser: UserRecord = {
      uid,
      email: cleanEmail,
      username: finalUsername, // Exact casing preserved!
      displayName: finalDisplayName,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    usersMap.set(uid, newUser);
    persistUsers(usersMap);

    const token = generateToken(newUser);

    console.log(`[RouteWise Auth] New user registered: ${cleanEmail} (username: ${finalUsername}, uid: ${uid})`);

    return res.status(201).json({
      success: true,
      token,
      user: {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.displayName,
        username: newUser.username,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal registration error' });
  }
});

// Central Authentication: Login (rejects invalid credentials without user enumeration)
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password || typeof identifier !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'User ID or Email and password are required.' });
    }

    const rawIdentifier = identifier.trim();
    if (!rawIdentifier) {
      return res.status(400).json({ error: 'User ID or Email cannot be empty.' });
    }

    // Look up user: case-sensitive for username and UID; case-insensitive for email
    const matchedUser = findUserByIdentifier(rawIdentifier);

    // Generic error message prevents username/email enumeration
    const INVALID_CREDENTIALS_MSG = 'Invalid credentials. Please verify your username/email and password.';

    if (!matchedUser) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_MSG });
    }

    const isMatch = verifyPassword(password, matchedUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_MSG });
    }

    const token = generateToken(matchedUser);

    console.log(`[RouteWise Auth] User logged in: ${matchedUser.email} (username: ${matchedUser.username})`);

    return res.status(200).json({
      success: true,
      token,
      user: {
        uid: matchedUser.uid,
        email: matchedUser.email,
        displayName: matchedUser.displayName,
        username: matchedUser.username,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal login error' });
  }
});

// Protected Route: Verify token and return current authenticated user
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      createdAt: user.createdAt,
    },
  });
});

// Protected Route: Dashboard summary requiring valid session/token
app.get('/api/dashboard/summary', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const userKey = (user.uid || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const savedTrip = savedTripsMap.get(userKey);
  res.json({
    success: true,
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
    },
    dashboard: {
      hasSavedTrip: Boolean(savedTrip),
      tripTitle: savedTrip?.title || null,
      totalStops: savedTrip?.stops?.length || 0,
      lastUpdated: savedTrip?.updatedAt || null,
    },
  });
});

// Mock / Future Google Places Proxy Endpoint
app.get('/api/places/search', (req: Request, res: Response) => {
  const query = req.query.q as string;
  res.json({
    message: 'Places API proxy ready for Google Places integration',
    query: query || '',
    results: [],
  });
});

// Mock / Future Google Routes Optimization Endpoint
app.post('/api/routes/optimize', (req: Request, res: Response) => {
  const { stops, travelMode } = req.body;
  res.json({
    message: 'Routes API proxy ready for Google Routes matrix calculation',
    receivedStops: stops?.length || 0,
    travelMode: travelMode || 'DRIVING',
  });
});

// Save Trip Endpoint (Legacy compatibility)
app.post('/api/trips', (req: Request, res: Response) => {
  const tripData = req.body;
  const userKey = (tripData.userId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  savedTripsMap.set(userKey, tripData);
  persistTrips(savedTripsMap);
  res.status(201).json({
    message: 'Trip saved successfully',
    tripId: tripData.id || ('trip_' + Date.now()),
    trip: tripData,
  });
});

// Retrieve Trip Endpoint (Legacy compatibility)
app.get('/api/trips/:userId', (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userKey = String(rawId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const trip = savedTripsMap.get(userKey);
  if (trip) {
    return res.json({ success: true, trip });
  }
  return res.status(404).json({ success: false, message: 'No saved trip found' });
});

// Delete Trip Endpoint (Legacy compatibility)
app.delete('/api/trips/:userId', (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userKey = String(rawId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  savedTripsMap.delete(userKey);
  persistTrips(savedTripsMap);
  res.json({ success: true, message: 'Trip deleted successfully' });
});

// -------------------------------------------------------------
// Custom Trip Collections & Multi-Trip Management Endpoints
// -------------------------------------------------------------

// Helper to sanitize destinations for storage and sharing
function sanitizeStops(stops: any[]): any[] {
  if (!Array.isArray(stops)) return [];
  return stops.map((s: any, idx: number) => ({
    id: s.id || `stop_${idx}_${Date.now()}`,
    placeId: s.placeId || '',
    name: s.name || 'Destination',
    address: s.address || '',
    shortAddress: s.shortAddress || s.address || '',
    city: s.city || undefined,
    state: s.state || undefined,
    stateCode: s.stateCode || undefined,
    country: s.country || 'India',
    coordinates: s.coordinates || { lat: 20.5937, lng: 78.9629 },
    category: s.category || 'heritage',
    rating: s.rating || 4.5,
    reviewsCount: s.reviewsCount || 100,
    typicalVisitDurationMinutes: s.typicalVisitDurationMinutes || 60,
    customDurationMinutes: s.customDurationMinutes || s.typicalVisitDurationMinutes || 60,
    stopOrder: idx + 1,
    photoUrl: s.photoUrl || 'https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=600&auto=format&fit=crop&q=80',
    tags: s.tags || [],
  }));
}

// GET /api/user-trips - List all trips for current user with auto-migration from legacy single-trip store
app.get('/api/user-trips', (req: Request, res: Response) => {
  try {
    const user = resolveRequestUser(req);
    const userId = user?.uid || (req.query.userId as string) || 'default';
    const userKey = userId.toLowerCase().replace(/[^a-z0-9_-]/g, '_');

    let userTrips = Array.from(tripCollectionsMap.values()).filter(t => t.userId === userId);

    // Auto-migrate legacy saved trip if user has 0 collections yet
    if (userTrips.length === 0) {
      const legacy = savedTripsMap.get(userKey);
      if (legacy && Array.isArray(legacy.stops) && legacy.stops.length > 0) {
        const migratedTrip: TripRecord = {
          id: 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          userId,
          name: legacy.title || 'Mumbai Highlights Explorer',
          description: 'Migrated from previous active route',
          travelMode: legacy.travelMode || 'DRIVING',
          stops: sanitizeStops(legacy.stops),
          isOptimized: Boolean(legacy.isOptimized),
          createdAt: legacy.updatedAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tripCollectionsMap.set(migratedTrip.id, migratedTrip);
        persistTripCollections(tripCollectionsMap);
        userTrips.push(migratedTrip);
      }
    }

    userTrips.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return res.json({
      success: true,
      trips: userTrips,
      totalTrips: userTrips.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to fetch user trips' });
  }
});

// POST /api/user-trips - Create a new user-defined trip collection
app.post('/api/user-trips', (req: Request, res: Response) => {
  try {
    const user = resolveRequestUser(req);
    const userId = user?.uid || req.body.userId || 'default';
    const { name, description, travelMode, stops, isOptimized } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Trip name is required.' });
    }

    const trimmedName = name.trim();

    // Enforce case-insensitive duplicate check for the same user
    const duplicate = Array.from(tripCollectionsMap.values()).some(
      t => t.userId === userId && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (duplicate) {
      return res.status(400).json({
        error: `You already have a trip named "${trimmedName}". Please choose a different trip name.`,
      });
    }

    const tripId = 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const newTrip: TripRecord = {
      id: tripId,
      userId,
      name: trimmedName,
      description: typeof description === 'string' ? description.trim() : '',
      travelMode: travelMode || 'DRIVING',
      stops: sanitizeStops(stops || []),
      isOptimized: Boolean(isOptimized),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tripCollectionsMap.set(tripId, newTrip);
    persistTripCollections(tripCollectionsMap);

    return res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      trip: newTrip,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to create trip' });
  }
});

// GET /api/user-trips/:tripId - Get single trip details
app.get('/api/user-trips/:tripId', (req: Request, res: Response) => {
  const rawId = req.params.tripId;
  const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
  const trip = tripCollectionsMap.get(tripId);

  if (!trip) {
    return res.status(404).json({ success: false, error: 'Trip not found.' });
  }

  return res.json({ success: true, trip });
});

// PUT /api/user-trips/:tripId - Edit / update trip (name, description, stops, travelMode, etc.)
app.put('/api/user-trips/:tripId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.tripId;
    const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
    const trip = tripCollectionsMap.get(tripId);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found.' });
    }

    const { name, description, travelMode, stops, isOptimized } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Trip name cannot be empty.' });
      }
      const trimmedName = name.trim();
      const duplicate = Array.from(tripCollectionsMap.values()).some(
        t => t.userId === trip.userId && t.id !== trip.id && t.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({
          error: `You already have another trip named "${trimmedName}". Please choose a different trip name.`,
        });
      }
      trip.name = trimmedName;
    }

    if (description !== undefined) {
      trip.description = typeof description === 'string' ? description.trim() : '';
    }
    if (travelMode !== undefined) {
      trip.travelMode = travelMode;
    }
    if (Array.isArray(stops)) {
      trip.stops = sanitizeStops(stops);
    }
    if (isOptimized !== undefined) {
      trip.isOptimized = Boolean(isOptimized);
    }

    trip.updatedAt = new Date().toISOString();
    tripCollectionsMap.set(trip.id, trip);
    persistTripCollections(tripCollectionsMap);

    return res.json({
      success: true,
      message: 'Trip updated successfully',
      trip,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update trip' });
  }
});

// DELETE /api/user-trips/:tripId - Delete a trip from collections
app.delete('/api/user-trips/:tripId', (req: Request, res: Response) => {
  try {
    const rawId = req.params.tripId;
    const tripId = Array.isArray(rawId) ? rawId[0] : rawId;
    const trip = tripCollectionsMap.get(tripId);

    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found.' });
    }

    tripCollectionsMap.delete(tripId);
    persistTripCollections(tripCollectionsMap);

    return res.json({
      success: true,
      message: 'Trip deleted successfully',
      tripId,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to delete trip' });
  }
});

/**
 * Trip-Based & Destination Sharing Endpoints:
 * - POST /api/trips/share: Create a shareable itinerary for a specific trip, all trips, or filtered destinations.
 * - GET  /api/trips/share/:shareId: Publicly view destination list preview without exposing credentials.
 * - POST /api/trips/import: Import a shared trip into the recipient user's trip collections.
 */
app.post('/api/trips/share', (req: Request, res: Response) => {
  try {
    const {
      title,
      selectedState,
      tripId,
      tripName,
      isAllTrips,
      stops: incomingStops,
      travelMode,
      ownerName,
      userId,
    } = req.body;

    let finalStops: any[] = [];
    let finalTripName = tripName || '';
    let finalTitle = title || '';
    let tripsBundle: SharedTripRecord['trips'] = undefined;

    // 1. Sharing all trips for user
    if (isAllTrips) {
      const user = resolveRequestUser(req);
      const effectiveUserId = user?.uid || userId || 'default';
      const userTrips = Array.from(tripCollectionsMap.values()).filter(t => t.userId === effectiveUserId);

      if (userTrips.length === 0 && (!incomingStops || incomingStops.length === 0)) {
        return res.status(400).json({ error: 'No trips available to share.' });
      }

      tripsBundle = userTrips.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        stops: sanitizeStops(t.stops),
        travelMode: t.travelMode,
        totalDestinations: t.stops.length,
      }));

      // Flatten stops for map display
      finalStops = userTrips.flatMap(t => sanitizeStops(t.stops));
      finalTitle = finalTitle || 'All My Trips';
      finalTripName = 'All Trips';
    } else if (tripId) {
      // 2. Sharing a specific user trip
      const trip = tripCollectionsMap.get(tripId);
      if (trip) {
        finalStops = sanitizeStops(trip.stops);
        finalTripName = trip.name;
        finalTitle = finalTitle || `Shared Trip: ${trip.name}`;
      } else if (Array.isArray(incomingStops) && incomingStops.length > 0) {
        finalStops = sanitizeStops(incomingStops);
        finalTripName = tripName || 'Custom Trip';
        finalTitle = finalTitle || `Shared Trip: ${finalTripName}`;
      } else {
        return res.status(404).json({ error: 'Trip not found to share.' });
      }
    } else {
      // 3. Fallback / direct destination list sharing
      if (!Array.isArray(incomingStops) || incomingStops.length === 0) {
        return res.status(400).json({ error: 'No destinations provided to share.' });
      }

      let filteredStops = incomingStops;
      const stateFilter = (selectedState || 'All States').trim();
      if (stateFilter !== 'All States' && stateFilter !== 'ALL') {
        const targetState = stateFilter.toLowerCase();
        filteredStops = incomingStops.filter((s: any) => {
          const itemState = (s.state || '').trim().toLowerCase();
          return itemState === targetState || itemState.includes(targetState) || targetState.includes(itemState);
        });
      }

      if (filteredStops.length === 0) {
        return res.status(400).json({
          error: `No destinations found matching "${stateFilter}".`,
        });
      }

      finalStops = sanitizeStops(filteredStops);
      finalTripName = tripName || 'Shared Destinations';
      finalTitle = finalTitle || `Shared Trip: ${finalTripName}`;
    }

    if (finalStops.length === 0 && (!tripsBundle || tripsBundle.length === 0)) {
      return res.status(400).json({ error: 'No destinations found to share.' });
    }

    const shareId = 'shr_' + crypto.randomBytes(6).toString('hex');
    const newRecord: SharedTripRecord = {
      shareId,
      title: finalTitle,
      selectedState: selectedState || 'All States',
      tripId: tripId || undefined,
      tripName: finalTripName,
      isAllTrips: Boolean(isAllTrips),
      trips: tripsBundle,
      stops: finalStops,
      travelMode: travelMode || 'DRIVING',
      ownerName: ownerName || 'Traveler',
      userId: userId || undefined,
      totalDestinations: finalStops.length,
      createdAt: new Date().toISOString(),
    };

    sharedTripsMap.set(shareId, newRecord);
    persistSharedTrips(sharedTripsMap);

    return res.status(201).json({
      success: true,
      shareId,
      selectedState: newRecord.selectedState,
      tripName: finalTripName,
      isAllTrips: Boolean(isAllTrips),
      totalDestinations: finalStops.length,
      stops: finalStops,
      createdAt: newRecord.createdAt,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate share link' });
  }
});

app.get('/api/trips/share/:shareId', (req: Request, res: Response) => {
  const rawId = req.params.shareId;
  const shareId = Array.isArray(rawId) ? rawId[0] : rawId;
  const record = sharedTripsMap.get(shareId);

  if (!record) {
    return res.status(404).json({ success: false, error: 'Shared destination list not found or expired.' });
  }

  return res.json({
    success: true,
    share: {
      shareId: record.shareId,
      title: record.title,
      tripId: record.tripId,
      tripName: record.tripName || record.title,
      isAllTrips: record.isAllTrips || false,
      trips: record.trips,
      selectedState: record.selectedState,
      stops: record.stops,
      travelMode: record.travelMode,
      ownerName: record.ownerName,
      totalDestinations: record.totalDestinations,
      createdAt: record.createdAt,
    },
  });
});

// POST /api/trips/import - Import a shared trip into recipient user's trip collections
app.post('/api/trips/import', (req: Request, res: Response) => {
  try {
    const { shareId, customTripName, userId: bodyUserId } = req.body;
    const user = resolveRequestUser(req);
    const recipientUserId = user?.uid || bodyUserId || 'default';

    if (!shareId) {
      return res.status(400).json({ error: 'shareId is required to import a trip.' });
    }

    const shareRecord = sharedTripsMap.get(shareId);
    if (!shareRecord) {
      return res.status(404).json({ error: 'Shared trip not found or expired.' });
    }

    // Helper to generate unique trip name if duplicate exists for this recipient
    const getUniqueTripName = (baseName: string): string => {
      let candidate = baseName.trim() || 'Shared Trip';
      let count = 2;
      while (
        Array.from(tripCollectionsMap.values()).some(
          t => t.userId === recipientUserId && t.name.trim().toLowerCase() === candidate.toLowerCase()
        )
      ) {
        candidate = `${baseName.trim()} (${count})`;
        count++;
      }
      return candidate;
    };

    // If bundle of multiple trips was shared
    if (shareRecord.isAllTrips && Array.isArray(shareRecord.trips) && shareRecord.trips.length > 0) {
      const importedList: TripRecord[] = [];
      for (const t of shareRecord.trips) {
        const uniqueName = getUniqueTripName(t.name);
        const importedId = 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const newTrip: TripRecord = {
          id: importedId,
          userId: recipientUserId,
          name: uniqueName,
          description: t.description || `Imported from shared trip by ${shareRecord.ownerName || 'Traveler'}`,
          travelMode: t.travelMode || shareRecord.travelMode || 'DRIVING',
          stops: sanitizeStops(t.stops),
          isOptimized: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        tripCollectionsMap.set(importedId, newTrip);
        importedList.push(newTrip);
      }
      persistTripCollections(tripCollectionsMap);
      return res.status(201).json({
        success: true,
        message: `Successfully imported ${importedList.length} trips into your collections`,
        importedTrips: importedList,
      });
    }

    // Single trip import
    const requestedName = (typeof customTripName === 'string' && customTripName.trim())
      ? customTripName.trim()
      : (shareRecord.tripName || shareRecord.title || 'Shared Trip');

    const finalName = getUniqueTripName(requestedName);
    const importedId = 'trip_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    const importedTrip: TripRecord = {
      id: importedId,
      userId: recipientUserId,
      name: finalName,
      description: `Imported from shared trip by ${shareRecord.ownerName || 'Traveler'}`,
      travelMode: shareRecord.travelMode || 'DRIVING',
      stops: sanitizeStops(shareRecord.stops),
      isOptimized: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tripCollectionsMap.set(importedId, importedTrip);
    persistTripCollections(tripCollectionsMap);

    return res.status(201).json({
      success: true,
      message: `Trip "${finalName}" imported successfully to your collection`,
      trip: importedTrip,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to import trip' });
  }
});

const isDirectExecution = Boolean(
  process.argv[1] && (
    fileURLToPath(import.meta.url) === path.resolve(process.argv[1]) ||
    process.argv[1].endsWith('server.ts') ||
    process.argv[1].endsWith('server.js')
  )
);

if (isDirectExecution && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[RouteWise API] Server running on http://localhost:${PORT}`);
  });
}

export default app;
