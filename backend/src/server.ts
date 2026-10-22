import express from 'express';
import cors from 'cors';
import './db';
import { authRouter } from './auth';
import { apiRouter } from './routes';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`StudySync API running on http://localhost:${PORT}`);
});
