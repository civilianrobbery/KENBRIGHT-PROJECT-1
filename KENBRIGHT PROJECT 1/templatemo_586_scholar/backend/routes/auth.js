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
        
        // Check if user exists
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (user) {
                return res.status(400).json({ error: 'User already exists' });
            }
            
            // Hash password
            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Create user
            db.run(
                'INSERT INTO users (email, name, password) VALUES (?, ?, ?)',
                [email, name, hashedPassword],
                function(err) {
                    if (err) {
                        return res.status(500).json({ error: 'Error creating user' });
                    }
                    
                    const newUser = {
                        id: this.lastID,
                        email,
                        name,
                        role: 'user'
                    };
                    
                    // Create JWT token
                    const token = jwt.sign(
                        { id: newUser.id, email: newUser.email },
                        process.env.JWT_SECRET,
                        { expiresIn: process.env.JWT_EXPIRE }
                    );
                    
                    res.status(201).json({
                        message: 'User registered successfully',
                        user: newUser,
                        token
                    });
                }
            );
        });
    } catch (error) {
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
        
        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            
            // Check password
            const isPasswordValid = await bcrypt.compare(password, user.password);
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
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE }
            );
            
            res.json({
                message: 'Login successful',
                user: userResponse,
                token
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Guest login
router.post('/guest', (req, res) => {
    const demoEmail = 'demo@kenbright.com';
    const demoPassword = 'demo123';
    
    // Find demo user
    db.get('SELECT * FROM users WHERE email = ?', [demoEmail], async (err, user) => {
        if (err || !user) {
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
            process.env.JWT_SECRET,
            { expiresIn: '1d' } // Shorter expiry for guest
        );
        
        res.json({
            message: 'Guest login successful',
            user: userResponse,
            token,
            isGuest: true
        });
    });
});

// Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        db.get('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.id], (err, user) => {
            if (err || !user) {
                return res.status(401).json({ error: 'User not found' });
            }
            
            res.json({ valid: true, user });
        });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

module.exports = router;