const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const initializeDatabase = require('./database-sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://kenbright-ifrs17-training.onrender.com', 'https://*.onrender.com']
        : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
const basePath = process.env.NODE_ENV === 'production' 
    ? path.join(__dirname, '..') 
    : path.join(__dirname, '..');

app.use(express.static(basePath));

// Initialize database and start server
async function startServer() {
    try {
        console.log('🔄 Initializing database...');
        const db = await initializeDatabase();
        
        // Make db available to all requests via middleware
        app.use((req, res, next) => {
            req.db = db;
            next();
        });
        
        app.set('db', db); // Also store in app settings
        
        console.log('✅ Database initialized');
        
        // Import routes AFTER db is initialized
        const authRoutes = require('./routes/auth');
        const progressRoutes = require('./routes/progress');
        
        // API Routes
        app.use('/api/auth', authRoutes);
        app.use('/api/progress', progressRoutes);
        
        // Health check
        app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'OK', 
                message: 'Kenbright IFRS 17 Backend is running',
                environment: process.env.NODE_ENV || 'development',
                timestamp: new Date().toISOString()
            });
        });
        
        // Serve frontend pages - make sure this comes AFTER API routes
        app.get('/', (req, res) => {
            res.sendFile(path.join(basePath, 'index.html'));
        });
        
        app.get('/login', (req, res) => {
            res.sendFile(path.join(basePath, 'login.html'));
        });
        
        app.get('/progress', (req, res) => {
            res.sendFile(path.join(basePath, 'progress.html'));
        });
        
        app.get('/modules', (req, res) => {
            res.sendFile(path.join(basePath, 'modules.html'));
        });
        
        app.get('/assessments', (req, res) => {
            res.sendFile(path.join(basePath, 'assessments.html'));
        });
        
        // Dynamic routes for modules (1-15)
        app.get('/module-:id(\\d+)', (req, res) => {
            const moduleId = req.params.id;
            res.sendFile(path.join(basePath, `module-${moduleId}.html`));
        });
        
        // Dynamic routes for assessments (1-15)
        app.get('/assessment-:id(\\d+)', (req, res) => {
            const assessmentId = req.params.id;
            res.sendFile(path.join(basePath, `assessment-${assessmentId}.html`));
        });
        
        // Catch-all for other files
        app.get('*', (req, res) => {
            res.sendFile(path.join(basePath, req.url));
        });
        
        // Error handling middleware
        app.use((err, req, res, next) => {
            console.error('Server Error:', err.stack);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message
            });
        });
        
        app.listen(PORT, () => {
            console.log(`✅ Kenbright IFRS 17 Backend running on port: ${PORT}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`🚀 Server ready!`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();