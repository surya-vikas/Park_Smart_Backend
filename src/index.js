import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import connectDB from './config/db.js';
import { PORT } from './config/index.js';
import { initIO } from './utils/io.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import providerRoutes from './routes/providerRoutes.js';
import parkingRoutes from './routes/parkingRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import vehicleRoutes from './routes/vehicleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import walletRoutes from './routes/walletRoutes.js';

const app = express();
const server = http.createServer(app);

// Demo app: reflect any frontend origin (local dev + deployed sites).
const corsOptions = { origin: true, credentials: true };

const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
});
initIO(io);

io.on('connection', () => {
  // Realtime availability updates are broadcast as "parking:update" events.
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'parksmart-api' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/parking', parkingRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wallet', walletRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  await connectDB();
  server.listen(PORT, () => console.log(`ParkSmart API running on http://localhost:${PORT}`));
};

start();