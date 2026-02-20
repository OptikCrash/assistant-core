import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import { auditRouter } from './routes/audit';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';
import { reviewRouter } from './routes/review';
import { reviewSmartRouter } from './routes/reviewSmart';
import { workspaceRouter } from './routes/workspace';


const app = express();
app.use(cors());
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/execute', executeRouter);
app.use('/audit', auditRouter);
app.use('/review', reviewRouter);
app.use('/review-smart', reviewSmartRouter);
app.use('/workspace', workspaceRouter);

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Assistant core running on http://localhost:${PORT}`);
});