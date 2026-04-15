import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { auditRouter } from './routes/audit';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';
import { reviewRouter } from './routes/review';
import { reviewSmartRouter } from './routes/reviewSmart';
import { workspaceRouter } from './routes/workspace';


const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/chat', chatRouter);
app.use('/api/execute', executeRouter);
app.use('/api/audit', auditRouter);
app.use('/api/review', reviewRouter);
app.use('/api/review-smart', reviewSmartRouter);
app.use('/api/workspace', workspaceRouter);

const PORT = parseInt(env.PORT, 10) || 1339;
app.listen(PORT, () => {
    console.log(`Assistant core running on http://localhost:${PORT}`);
});