import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { searchChannel } from './routes/search.js';
import { analyzeVideo } from './routes/analyze.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = [
  process.env.FRONTEND_URL?.replace(/\/$/, ''),
  'https://scriptgenapp.vercel.app',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.options('*', cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/search', searchChannel);
app.post('/api/analyze', analyzeVideo);

app.listen(PORT, () => {
  console.log('?? ScriptGen backend running on port ' + PORT);
});
