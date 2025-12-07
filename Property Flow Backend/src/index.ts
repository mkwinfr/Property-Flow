import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './db/prisma';
import apartmentsRouter from './routes/apartments';
import makeReadyBoardRouter from './routes/makeReadyBoard';
import turnsRouter from './routes/turns';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Property Flow backend is alive' });
});

// Simple test route to verify DB connectivity
app.get('/api/test-db', async (_req, res) => {
  try {
    const count = await prisma.apartment.count();
    res.json({ ok: true, apartmentCount: count });
  } catch (err) {
    console.error('DB test failed', err);
    res.status(500).json({ ok: false, error: 'DB connection failed' });
  }
});

// Feature routers
app.use('/api/apartments', apartmentsRouter);
app.use('/api/make-ready-board', makeReadyBoardRouter);
app.use('/api/turns', turnsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Property Flow backend listening on port ${PORT}`);
});
