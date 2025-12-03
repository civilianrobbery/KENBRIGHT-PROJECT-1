const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const { email, name, password } = req.body;
        
        // Validation
        if (!email || !name || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user exists
        const user = await db.get('SELECT id FROM users WHERE email = ?', email);
        
        if (user) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        // Create user
        const result = await db.run(
            'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
            email, name, hashedPassword
        );
        
        const newUser = {
            id: result.lastID,
            email,
            name,
            role: 'user'
        };
        
        // Create JWT token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '30d' }
        );
        
        res.status(201).json({
            message: 'User registered successfully',
            user: newUser,
            token
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user
        const user = await db.get('SELECT * FROM users WHERE email = ?', email);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isPasswordValid = bcrypt.compareSync(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Create user object without password
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key',
            { expiresIn: process.env.JWT_EXPIRE || '30d' }
        );
        
        res.json({
            message: 'Login successful',
            user: userResponse,
            token
        });
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Guest login
router.post('/guest', async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const demoEmail = 'demo@kenbright.com';
        
        // Find demo user
        const user = await db.get('SELECT * FROM users WHERE email = ?', demoEmail);
        
        if (!user) {
            return res.status(500).json({ error: 'Demo account not available' });
        }
        
        // Create user object without password
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
        };
        
        // Create JWT token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key',
            { expiresIn: '1d' } // Shorter expiry for guest
        );
        
        res.json({
            message: 'Guest login successful',
            user: userResponse,
            token,
            isGuest: true
        });
        
    } catch (error) {
        console.error('Guest login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Verify token
router.get('/verify', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const db = req.db; // Get db from middleware
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key');
        
        const user = await db.get('SELECT id, email, name, role FROM users WHERE id = ?', decoded.id);
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        res.json({ valid: true, user });
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;