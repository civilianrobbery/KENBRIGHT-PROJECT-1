const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kenbright-ifrs17-secret-key');
        req.userId = decoded.id;
        next();
    } catch (error) {
        // Fallback to simple verification for demo
        try {
            const userId = parseInt(token.split('_')[1]);
            if (!userId) {
                return res.status(401).json({ error: 'Invalid token' });
            }
            req.userId = userId;
            next();
        } catch (fallbackError) {
            res.status(401).json({ error: 'Invalid token' });
        }
    }
};

// Get user's overall progress
router.get('/', verifyToken, async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const userId = req.userId;
        
        // Get all modules progress
        const modules = await db.all(
            `SELECT * FROM user_progress WHERE user_id = ? ORDER BY module_id`,
            userId
        );
        
        // Get assessments
        const assessments = await db.all(
            `SELECT * FROM assessments WHERE user_id = ? ORDER BY taken_at DESC LIMIT 10`,
            userId
        );
        
        // Calculate overall stats
        const completedModules = modules.filter(m => m.completed).length;
        const totalModules = 15;
        
        const completedWithScore = modules.filter(m => m.completed && m.score > 0);
        const averageScore = completedWithScore.length > 0
            ? Math.round(completedWithScore.reduce((sum, m) => sum + m.score, 0) / completedWithScore.length)
            : 0;
        
        const totalTimeSpent = modules.reduce((sum, m) => sum + (m.time_spent || 0), 0);
        
        res.json({
            completedModules,
            totalModules,
            averageScore,
            timeSpent: Math.round(totalTimeSpent / 60),
            overallProgress: Math.round((completedModules / totalModules) * 100),
            modules,
            assessments
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update module progress
router.post('/:moduleId', verifyToken, async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const userId = req.userId;
        const moduleId = parseInt(req.params.moduleId);
        const { progress, score, timeSpent } = req.body;
        
        if (isNaN(moduleId) || moduleId < 1 || moduleId > 15) {
            return res.status(400).json({ error: 'Invalid module ID' });
        }
        
        // Check if progress record exists
        const existing = await db.get(
            `SELECT * FROM user_progress WHERE user_id = ? AND module_id = ?`,
            userId, moduleId
        );
        
        const completed = progress >= 100;
        const timeToAdd = timeSpent || 0;
        
        if (existing) {
            // Update existing record
            const newProgress = Math.max(progress || 0, existing.progress || 0);
            const newScore = Math.max(score || 0, existing.score || 0);
            
            await db.run(
                `UPDATE user_progress SET 
                    progress = ?,
                    completed = ?,
                    score = ?,
                    time_spent = time_spent + ?,
                    last_accessed = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND module_id = ?`,
                newProgress, completed, newScore, timeToAdd, userId, moduleId
            );
            
            res.json({ message: 'Progress updated' });
            
        } else {
            // Create new record
            await db.run(
                `INSERT INTO user_progress 
                 (user_id, module_id, progress, completed, score, time_spent, last_accessed)
                 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                userId, moduleId, progress || 0, completed, score || 0, timeToAdd
            );
            
            res.json({ message: 'Progress saved' });
        }
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Save assessment result
router.post('/:moduleId/assessment', verifyToken, async (req, res) => {
    try {
        const db = req.db; // Get db from middleware
        const userId = req.userId;
        const moduleId = parseInt(req.params.moduleId);
        const { score, totalQuestions, correctAnswers, timeSpent, feedback } = req.body;
        
        if (isNaN(moduleId) || moduleId < 1 || moduleId > 15) {
            return res.status(400).json({ error: 'Invalid module ID' });
        }
        
        // Save assessment
        const result = await db.run(
            `INSERT INTO assessments 
             (user_id, module_id, score, total_questions, correct_answers, time_spent, feedback)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            userId, moduleId, score, totalQuestions, correctAnswers, timeSpent, feedback
        );
        
        // Update module progress to mark as completed with score
        await db.run(
            `INSERT OR REPLACE INTO user_progress 
             (user_id, module_id, progress, completed, score, time_spent, last_accessed)
             VALUES (?, ?, 100, 1, ?, COALESCE((SELECT time_spent FROM user_progress WHERE user_id = ? AND module_id = ?), 0), CURRENT_TIMESTAMP)`,
            userId, moduleId, score, userId, moduleId
        );
        
        res.json({ 
            message: 'Assessment saved',
            assessmentId: result.lastID 
        });
        
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get module titles
router.get('/modules/titles', (req, res) => {
    const moduleTitles = {
        1: 'Introduction & Fundamental Principles of IFRS 17',
        2: 'Combination and Separation of Insurance Contracts',
        3: 'Level of Aggregation',
        4: 'General Measurement Model (GMM)',
        5: 'Premium Allocation Approach (PAA)',
        6: 'Variable Fee Approach (VFA)',
        7: 'Contractual Service Margin (CSM)',
        8: 'Risk Adjustment',
        9: 'Discount Rates and Time Value of Money',
        10: 'Initial Recognition and Measurement',
        11: 'Subsequent Measurement',
        12: 'Presentation and Disclosure',
        13: 'Transition Requirements',
        14: 'Implementation Challenges',
        15: 'Case Studies and Practical Applications'
    };
    
    res.json(moduleTitles);
});

module.exports = router;