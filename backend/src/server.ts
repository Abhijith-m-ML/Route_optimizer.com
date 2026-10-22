import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    project: 'Smart Mumbai Travel Planner (RouteWise)',
    timestamp: new Date().toISOString(),
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

// Mock Trips Persistence Endpoint
app.post('/api/trips', (req: Request, res: Response) => {
  const tripData = req.body;
  res.status(201).json({
    message: 'Trip saved successfully',
    tripId: 'trip_' + Date.now(),
    trip: tripData,
  });
});

app.listen(PORT, () => {
  console.log(`[RouteWise API] Server running on http://localhost:${PORT}`);
});

export default app;
