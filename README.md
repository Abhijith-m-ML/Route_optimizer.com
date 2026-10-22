# Smart Mumbai Travel Planner (RouteWise)

A modern, responsive travel-planning platform designed to explore Mumbai's landmarks, calculate optimized itineraries, and visualize travel routes.

---

## 📁 Project Architecture

The project is structured with a separated **frontend** and **backend**:

```
mumbi/
├── frontend/                                # React + Vite + TypeScript + Tailwind CSS UI
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/
│   │   │   │   ├── ProtectedRoute.tsx      # Route guard redirecting to /login with state
│   │   │   │   └── PublicOnlyRoute.tsx     # Redirects authenticated users to /dashboard
│   │   │   ├── Map/
│   │   │   │   └── InteractiveMap.tsx      # Stage 4: Interactive Mumbai Map with Numbered Teardrop Markers & InfoWindows
│   │   │   ├── Sidebar/
│   │   │   │   ├── DestinationCard.tsx     # Stop card with sequence badge, timing, short address, reordering
│   │   │   │   ├── DestinationList.tsx     # Sequence list, empty state, and Clear All confirmation dialog
│   │   │   │   ├── RouteOptimizer.tsx      # "Optimize Route" action & solver
│   │   │   │   ├── SearchBox.tsx           # Stage 4: Google Places Autocomplete search with debounce & duplicate check
│   │   │   │   ├── Sidebar.tsx             # 35% Travel Dashboard Sidebar
│   │   │   │   └── TripMetrics.tsx         # Distance, Duration, Stops & Cost Summary
│   │   │   ├── Navbar.tsx                  # Top Bar: RouteWise Logo, Title, User Profile, Log Out
│   │   │   └── Toast.tsx                   # Floating status notifications
│   │   ├── config/
│   │   │   └── firebase.ts                 # Centralized Firebase initialization & config check
│   │   ├── context/
│   │   │   └── AuthContext.tsx             # Persistent authentication state & provider
│   │   ├── data/
│   │   │   └── mumbaiPlaces.ts             # Curated database of iconic Mumbai attractions
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx           # Protected travel planning dashboard
│   │   │   ├── ForgotPasswordPage.tsx      # Password recovery request form
│   │   │   ├── LoginPage.tsx               # Login with email/password & Google
│   │   │   └── SignupPage.tsx              # User registration with password strength meter
│   │   ├── services/
│   │   │   ├── authService.ts              # Firebase auth methods & friendly error mapper
│   │   │   ├── googleMapsLoader.ts         # Stage 3/4: Official Google Maps & Places JS API loader
│   │   │   └── placesService.ts            # Stage 4: Places Autocomplete & Details service with category inference
│   │   ├── tests/
│   │   │   ├── test_auth_logic.mjs         # Unit test suite for validation & error mapping
│   │   │   └── test_stage4_logic.mjs       # Unit test suite for Stage 4 places, markers & bounds logic
│   │   ├── types/
│   │   │   └── index.ts                    # Full TypeScript definitions with Destination & PlaceSuggestion
│   │   ├── utils/
│   │   │   ├── mapStyles.ts                # RouteWise Dark Night Google Maps theme
│   │   │   └── routeOptimizer.ts           # TSP solver & Haversine distance calculator
│   │   ├── App.tsx                         # BrowserRouter & application routing setup
│   │   ├── index.css                       # Tailwind CSS v4 styling & animations
│   │   └── main.tsx
│   ├── .env                                # Local active environment variables (protected by .gitignore)
│   ├── .env.example                        # Template for Google Maps and Firebase environment variables
│   ├── .gitignore                          # Excludes all .env files
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                                 # Node.js + Express + TypeScript API Server
│   ├── src/
│   │   └── server.ts                       # API endpoints for Places, Routes, and Trips
│   ├── .env                                # Local active environment variables
│   ├── .env.example                        # Environment config template
│   ├── .gitignore                          # Excludes all .env files
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

---

## 📍 Stage 4: Destination Search & Numbered Markers

### Features Implemented
1. **Google Places API Autocomplete**: Real-time debounced search for places, businesses, landmarks, and addresses across Mumbai biased within a 50 km radius.
2. **Duplicate Prevention**: Rejects adding identical destinations by verifying Google Place IDs (`placeId`).
3. **Numbered Map Markers**: High-DPI teardrop pins dynamically numbered `1`, `2`, `3`... representing the current itinerary order.
   - Marker 1: Emerald (Start)
   - Last Marker: Rose (End)
   - Intermediate Markers: Blue
   - Selected Marker: Indigo with gold halo and enlarged scale
4. **Dynamic Renumbering**: Removing any stop automatically renumbers all remaining markers immediately.
5. **Two-Way Synchronization**: Clicking a card in the sidebar highlights the marker on the map and opens its InfoWindow; clicking a marker on the map highlights its destination card in the sidebar.
6. **Map Bounds & Viewport**:
   - Automatically pans and zooms toward newly added places.
   - **Fit All Destinations** control adjusts bounds to encapsulate all stops without excessive zoom-out.
   - Resets to Mumbai center (`19.0760, 72.8777`, zoom 11) when the itinerary is cleared.
7. **Clear All Safeguard**: Prompts a confirmation dialog before wiping the itinerary.

### Google Cloud Places API Activation
For live place autocomplete queries, ensure **Places API (New)** is enabled in your Google Cloud Console:
1. Go to [Google Cloud Console - Places API (New)](https://console.cloud.google.com/apis/library/places.googleapis.com).
2. Ensure project `995930596730` is selected.
3. Click **Enable**.

---

## 🗺️ Google Maps Platform Setup

The application uses `VITE_GOOGLE_MAPS_API_KEY` configured in `frontend/.env`.

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSy...
```

---

## 🔐 Stage 2: Firebase Authentication Setup

Add Firebase credentials to `frontend/.env` (or click **"Explore Demo Mode"** on the landing page for immediate access):

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=routewise-mumbai.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=routewise-mumbai
VITE_FIREBASE_STORAGE_BUCKET=routewise-mumbai.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...
```

---

## 🚀 Running the Project

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173`.

### 2. Run Validation Test Suites

```bash
cd frontend
# Stage 4 Logic Test Suite (Places, Markers, Renumbering, Bounds)
node src/tests/test_stage4_logic.mjs

# Stage 2 Auth Test Suite
node src/tests/test_auth_logic.mjs
```

### 3. Backend

```bash
cd backend
npm install
npm run dev
```

The backend API server will run at `http://localhost:5000`.
