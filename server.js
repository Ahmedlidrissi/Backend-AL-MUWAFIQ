require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const PORT = process.env.PORT || 5000;
// Route imports
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const gymRoutes = require('./routes/gym');
const deenRoutes = require('./routes/deen');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Allow large bulk payloads

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/gym', gymRoutes);
app.use('/api/deen', deenRoutes);

// ─── Health Check (public – no auth) ─────────────────────────────────────────
const healthPayload = (_req, res) => {
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbStates[mongoose.connection.readyState] || 'unknown',
    });
};
app.get('/health', healthPayload);
app.get('/api/health', healthPayload);

// ─── Start ───────────────────────────────────────────────────────────────────

// Connect to MongoDB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch((err) => console.error('❌ MongoDB connection error:', err.message));

// Start the server unless running in Vercel serverless mode
if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}

// Export the Express API for Vercel or tests
module.exports = app;
