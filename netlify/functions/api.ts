import express from 'express';
import serverless from 'serverless-http';
import { createApiRouter } from '../../src/api/routes';

const app = express();
app.use(express.json({ limit: '8mb' }));

// Mount API router on all paths Netlify may pass depending on redirect rules
const apiRouter = createApiRouter();
app.use('/.netlify/functions/api', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

export const handler = serverless(app);
