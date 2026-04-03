import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchChannel } from './routes/search.js';
import { analyzeVideo } from './routes/analyze.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.post('/api/search', searchChannel);
app.post('/api/analyze', analyzeVideo);

app.listen(PORT, () => {
  console.log(`🚀 ScriptGen backend running on port ${PORT}`);
});
