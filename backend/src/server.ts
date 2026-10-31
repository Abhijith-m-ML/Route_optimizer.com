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
const DATA_FILE = path.join(__dirname, '..', 'trips_data.json');
const USERS_FILE = path.join(__dirname, '..', 'users_data.json');
const SHARED_TRIPS_FILE = path.join(__dirname, '..', 'shared_trips.json');

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

export interface SharedTripRecord {
  shareId: string;
  title: string;
  selectedState: string;
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
  try {
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return new Map(Object.entries(data));
    }
  } catch (err) {
    console.warn('[RouteWise API] Could not read users_data.json:', err);
  }
  return new Map();
}

function persistUsers(users: Map<string, UserRecord>) {
  try {
    const obj = Object.fromEntries(users);
    fs.writeFileSync(USERS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[RouteWise API] Could not write users_data.json:', err);
  }
}

export const usersMap = loadPersistedUsers();

function loadPersistedTrips(): Map<string, any> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return new Map(Object.entries(data));
    }
  } catch (err) {
    console.warn('[RouteWise API] Could not read trips_data.json:', err);
  }
  return new Map();
}

function persistTrips(trips: Map<string, any>) {
  try {
    const obj = Object.fromEntries(trips);
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[RouteWise API] Could not write trips_data.json:', err);
  }
}

export const savedTripsMap = loadPersistedTrips();

function loadPersistedSharedTrips(): Map<string, SharedTripRecord> {
  try {
    if (fs.existsSync(SHARED_TRIPS_FILE)) {
      const raw = fs.readFileSync(SHARED_TRIPS_FILE, 'utf-8');
      const data = JSON.parse(raw);
      return new Map(Object.entries(data));
    }
  } catch (err) {
    console.warn('[RouteWise API] Could not read shared_trips.json:', err);
  }
  return new Map();
}

function persistSharedTrips(trips: Map<string, SharedTripRecord>) {
  try {
    const obj = Object.fromEntries(trips);
    fs.writeFileSync(SHARED_TRIPS_FILE, JSON.stringify(obj, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[RouteWise API] Could not write shared_trips.json:', err);
  }
}

export const sharedTripsMap = loadPersistedSharedTrips();

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

  const user = usersMap.get(payload.uid);
  if (!user) {
    return res.status(401).json({ error: 'Access denied. Account no longer exists.' });
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
    version: '1.1.0',
    endpoints: {
      health: '/api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      dashboard: 'GET /api/dashboard/summary',
      trips: '/api/trips',
      share: 'POST /api/trips/share',
      getShare: 'GET /api/trips/share/:shareId',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Smart Travel Planner (RouteWise)',
    usersCount: usersMap.size,
    sharedTripsCount: sharedTripsMap.size,
    timestamp: new Date().toISOString(),
  });
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

// Save Trip Endpoint
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

// Retrieve Trip Endpoint (for cross-device synchronization between laptop & phone)
app.get('/api/trips/:userId', (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userKey = String(rawId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  const trip = savedTripsMap.get(userKey);
  if (trip) {
    return res.json({ success: true, trip });
  }
  return res.status(404).json({ success: false, message: 'No saved trip found' });
});

// Delete Trip Endpoint
app.delete('/api/trips/:userId', (req: Request, res: Response) => {
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userKey = String(rawId || 'default').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  savedTripsMap.delete(userKey);
  persistTrips(savedTripsMap);
  res.json({ success: true, message: 'Trip deleted successfully' });
});

/**
 * State-Based Sharing Endpoints:
 * - POST /api/trips/share: Create a shareable itinerary filtered strictly to selectedState.
 * - GET  /api/trips/share/:shareId: Publicly view destination list preview without exposing credentials.
 */
app.post('/api/trips/share', (req: Request, res: Response) => {
  try {
    const { title, selectedState, stops, travelMode, ownerName, userId } = req.body;

    if (!Array.isArray(stops) || stops.length === 0) {
      return res.status(400).json({ error: 'No destinations provided to share.' });
    }

    const stateFilter = (selectedState || 'All States').trim();
    let filteredStops = stops;

    // Strict state filtering on backend to prevent data leakage of unselected states
    if (stateFilter !== 'All States' && stateFilter !== 'ALL') {
      const targetState = stateFilter.toLowerCase();
      filteredStops = stops.filter((s: any) => {
        const itemState = (s.state || '').trim().toLowerCase();
        return itemState === targetState || itemState.includes(targetState) || targetState.includes(itemState);
      });
    }

    if (filteredStops.length === 0) {
      return res.status(400).json({
        error: `No destinations found matching state "${stateFilter}".`,
      });
    }

    // Sanitize destination objects (exclude sensitive internals, ensure state/city metadata preserved)
    const sanitizedStops = filteredStops.map((s: any, idx: number) => ({
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

    const shareId = 'shr_' + crypto.randomBytes(6).toString('hex');
    const newRecord: SharedTripRecord = {
      shareId,
      title: title || 'Shared Destinations',
      selectedState: stateFilter,
      stops: sanitizedStops,
      travelMode: travelMode || 'DRIVING',
      ownerName: ownerName || 'Traveler',
      userId: userId || undefined,
      totalDestinations: sanitizedStops.length,
      createdAt: new Date().toISOString(),
    };

    sharedTripsMap.set(shareId, newRecord);
    persistSharedTrips(sharedTripsMap);

    return res.status(201).json({
      success: true,
      shareId,
      selectedState: stateFilter,
      totalDestinations: sanitizedStops.length,
      stops: sanitizedStops,
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

  // Return public sanitized preview payload
  return res.json({
    success: true,
    share: {
      shareId: record.shareId,
      title: record.title,
      selectedState: record.selectedState,
      stops: record.stops,
      travelMode: record.travelMode,
      ownerName: record.ownerName,
      totalDestinations: record.totalDestinations,
      createdAt: record.createdAt,
    },
  });
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
