const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const progressRoutes = require('./routes/progress');

const app = express();
const PORT = process.env.PORT || 3000;

// Determine if we're in production (Render) or development
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
    origin: isProduction 
        ? ['https://kenbright-ifrs17-training.onrender.com', 'https://*.onrender.com']
        : ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// For Render: Base path is one level up from backend folder
const basePath = isProduction 
    ? path.join(__dirname, '..')  // In Render: go up from /opt/render/project/src/backend
    : path.join(__dirname, '..'); // In local: go up from backend folder

console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);
console.log(`Base path: ${basePath}`);

// Serve static files from the correct base path
app.use(express.static(basePath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Kenbright IFRS 17 Backend is running',
        environment: isProduction ? 'production' : 'development',
        basePath: basePath
    });
});

// Explicit routes for main pages (better for SEO and reliability)
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

app.get('/foundations', (req, res) => {
    res.sendFile(path.join(basePath, 'foundations.html'));
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

// Catch-all for other HTML files and assets
app.get('*', (req, res, next) => {
    // Skip API routes
    if (req.url.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    const requestedPath = req.path;
    
    // Try to serve the file directly
    const fullPath = path.join(basePath, requestedPath);
    
    // If it's a request for HTML without extension, add .html
    if (!path.extname(requestedPath) && !requestedPath.endsWith('/')) {
        const htmlPath = path.join(basePath, `${requestedPath}.html`);
        res.sendFile(htmlPath, (err) => {
            if (err) {
                // If HTML file not found, try the original path
                res.sendFile(fullPath, (err2) => {
                    if (err2) {
                        // If still not found, serve 404
                        res.status(404).sendFile(path.join(basePath, '404.html'), (err3) => {
                            if (err3) {
                                res.status(404).send(`
                                    <h1>404 - Page Not Found</h1>
                                    <p>The requested page ${requestedPath} was not found.</p>
                                    <p>Environment: ${isProduction ? 'Production' : 'Development'}</p>
                                    <p>Base Path: ${basePath}</p>
                                `);
                            }
                        });
                    }
                });
            }
        });
    } else {
        // Serve file with extension
        res.sendFile(fullPath, (err) => {
            if (err) {
                res.status(404).sendFile(path.join(basePath, '404.html'), (err2) => {
                    if (err2) {
                        res.status(404).send(`
                            <h1>404 - File Not Found</h1>
                            <p>The requested file ${requestedPath} was not found.</p>
                        `);
                    }
                });
            }
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err.stack);
    
    // Log full error details for debugging
    console.error('Error details:', {
        message: err.message,
        code: err.code,
        path: req.path,
        method: req.method
    });
    
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: isProduction ? 'Internal server error' : err.message,
        path: req.path
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

app.listen(PORT, () => {
    console.log(`✅ Kenbright IFRS 17 Backend running on port: ${PORT}`);
    console.log(`📁 Serving files from: ${basePath}`);
    console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);
    console.log(`🚀 Server ready at: ${isProduction ? `https://your-render-url.onrender.com` : `http://localhost:${PORT}`}`);
});