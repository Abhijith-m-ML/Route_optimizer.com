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
    project: 'Smart Mumbai Travel Planner (RouteWise)',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      dashboard: 'GET /api/dashboard/summary',
      trips: '/api/trips',
    },
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Smart Mumbai Travel Planner (RouteWise)',
    usersCount: usersMap.size,
    timestamp: new Date().toISOString(),
  });
});

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

    const rawUsername = (typeof username === 'string' && username.trim())
      ? username.trim()
      : cleanEmail.split('@')[0];
    const cleanUsername = rawUsername.toLowerCase();
    const finalDisplayName = (typeof displayName === 'string' && displayName.trim())
      ? displayName.trim()
      : rawUsername;

    // Check if user already exists (case-insensitive email or username)
    for (const u of usersMap.values()) {
      if (u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername) {
        return res.status(400).json({
          error: 'An account with this email address or username already exists. Please log in instead.',
        });
      }
    }

    const uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const passwordHash = hashPassword(password);
    const newUser: UserRecord = {
      uid,
      email: cleanEmail,
      username: cleanUsername,
      displayName: finalDisplayName,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    usersMap.set(uid, newUser);
    persistUsers(usersMap);

    const token = generateToken(newUser);

    console.log(`[RouteWise Auth] New user registered: ${cleanEmail} (${uid})`);

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

    const cleanInput = identifier.trim().toLowerCase();
    if (!cleanInput) {
      return res.status(400).json({ error: 'User ID or Email cannot be empty.' });
    }

    // Find user by email, username, displayName, or uid
    let matchedUser: UserRecord | undefined;
    for (const u of usersMap.values()) {
      if (
        u.email.toLowerCase() === cleanInput ||
        u.username.toLowerCase() === cleanInput ||
        u.displayName.toLowerCase() === cleanInput ||
        u.uid.toLowerCase() === cleanInput
      ) {
        matchedUser = u;
        break;
      }
    }

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

    console.log(`[RouteWise Auth] User logged in: ${matchedUser.email}`);

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
