import mongoose from 'mongoose';
import { createApp } from './app.js';
const { MONGODB_URI, JWT_SECRET, PORT = 4000, NODE_ENV } = process.env;
if (!MONGODB_URI) throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env.');
const app = createApp({ jwtSecret: JWT_SECRET, production: NODE_ENV === 'production' });
await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
const server = app.listen(PORT, () => console.log(`ApplyDesk API listening on port ${PORT}`));
async function shutdown() { server.close(async () => { await mongoose.disconnect(); process.exit(0); }); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
