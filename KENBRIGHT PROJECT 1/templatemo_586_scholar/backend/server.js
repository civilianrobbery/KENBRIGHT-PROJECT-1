const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from parent directory (frontend)
app.use(express.static(path.join(__dirname, '..')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Kenbright IFRS 17 Backend is running' });
});

// Serve frontend pages
app.get('*', (req, res) => {
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '..', req.url));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`✅ Kenbright Backend running on http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${path.join(__dirname, '..')}`);
});