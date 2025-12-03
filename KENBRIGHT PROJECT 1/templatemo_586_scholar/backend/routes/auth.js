const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;
        
        // Validation
        if (!email || !name || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        // Check if user exists using better-sqlite3
        try {
            const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            
            if (user) {
                return res.status(400).json({ error: 'User already exists' });
            }
            
            // Hash password
            const hashedPassword = bcrypt.hashSync(password, 10);
            
            // Create user using better-sqlite3
            const result = db.prepare(
                'INSERT INTO users (email, name, password) VALUES (?, ?, ?)'
            ).run(email, name, hashedPassword);
            
            const newUser = {
                id: result.lastInsertRowid,
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
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        // Find user using better-sqlite3
        try {
            const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
            
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
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
        
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Guest login
router.post('/guest', (req, res) => {
    const demoEmail = 'demo@kenbright.com';
    const demoPassword = 'demo123';
    
    // Find demo user using better-sqlite3
    try {
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(demoEmail);
        
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
        
    } catch (dbError) {
        console.error('Database error:', dbError);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key');
        
        try {
            const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(decoded.id);
            
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            res.json({ valid: true, user });
            
        } catch (dbError) {
            console.error('Database error:', dbError);
            return res.status(500).json({ error: 'Database error' });
        }
        
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;