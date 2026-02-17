import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import express from 'express';
import { chatRouter } from './routes/chat';
import { executeRouter } from './routes/execute';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/chat', chatRouter);
app.use('/execute', executeRouter);

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Assistant core running on http://localhost:${PORT}`);
});