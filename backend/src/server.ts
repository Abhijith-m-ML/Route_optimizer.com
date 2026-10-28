import express, { Request, Response } from 'express';
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

export interface UserRecord {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, key] = stored.split(':');
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
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

const usersMap = loadPersistedUsers();

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

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
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
      origin.includes('localhost')
    ) {
      return callback(null, true);
    }
    // Fallback: accept for development/preview deployment
    return callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Smart Mumbai Travel Planner (RouteWise)',
    usersCount: usersMap.size,
    timestamp: new Date().toISOString(),
  });
});

// Real Central Authentication: Register
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanUsername = cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail;
    const finalDisplayName = String(displayName || cleanUsername).trim();

    // Check if user already exists
    for (const u of usersMap.values()) {
      if (u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername) {
        return res.status(400).json({ error: 'An account with this email address or username already exists. Please log in instead.' });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
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

    console.log(`[RouteWise Auth] New user registered: ${cleanEmail} (${uid})`);

    return res.status(201).json({
      success: true,
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

// Real Central Authentication: Login (works on Laptop, Phone, Tablet)
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'User ID/Email and password are required' });
    }

    const cleanInput = String(identifier).trim().toLowerCase();

    // Find user by email, username, or display name
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

    if (!matchedUser) {
      return res.status(401).json({ error: 'Invalid User ID or Email. No matching account found. Please sign up first!' });
    }

    const isMatch = verifyPassword(password, matchedUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
    }

    console.log(`[RouteWise Auth] User logged in: ${matchedUser.email}`);

    return res.json({
      success: true,
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

// Cross-Device Trip Storage (disk-persisted & memory-cached keyed by userId)
const savedTripsMap = loadPersistedTrips();

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

app.listen(PORT, () => {
  console.log(`[RouteWise API] Server running on http://localhost:${PORT}`);
});

export default app;
