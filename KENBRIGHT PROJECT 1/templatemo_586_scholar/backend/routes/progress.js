const express = require('express');
const router = express.Router();
const db = require('../database');

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    // Simple verification - in production, use JWT
    // For now, we'll extract user ID from token string
    try {
        const userId = parseInt(token.split('_')[1]);
        if (!userId) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.userId = userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Get user's overall progress
router.get('/', verifyToken, (req, res) => {
    const userId = req.userId;
    
    // Get all modules progress
    db.all(
        `SELECT * FROM user_progress WHERE user_id = ? ORDER BY module_id`,
        [userId],
        (err, modules) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Get assessments
            db.all(
                `SELECT * FROM assessments WHERE user_id = ? ORDER BY taken_at DESC LIMIT 10`,
                [userId],
                (err, assessments) => {
                    if (err) {
                        return res.status(500).json({ error: 'Database error' });
                    }
                    
                    // Calculate overall stats
                    const completedModules = modules.filter(m => m.completed).length;
                    const totalModules = 15; // Total modules in the system
                    
                    const completedWithScore = modules.filter(m => m.completed && m.score > 0);
                    const averageScore = completedWithScore.length > 0
                        ? Math.round(completedWithScore.reduce((sum, m) => sum + m.score, 0) / completedWithScore.length)
                        : 0;
                    
                    const totalTimeSpent = modules.reduce((sum, m) => sum + (m.time_spent || 0), 0);
                    
                    res.json({
                        completedModules,
                        totalModules,
                        averageScore,
                        timeSpent: Math.round(totalTimeSpent / 60), // Convert to hours
                        overallProgress: Math.round((completedModules / totalModules) * 100),
                        modules,
                        assessments
                    });
                }
            );
        }
    );
});

// Update module progress
router.post('/:moduleId', verifyToken, (req, res) => {
    const userId = req.userId;
    const moduleId = parseInt(req.params.moduleId);
    const { progress, score, timeSpent } = req.body;
    
    if (isNaN(moduleId) || moduleId < 1 || moduleId > 15) {
        return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    // Check if progress record exists
    db.get(
        `SELECT * FROM user_progress WHERE user_id = ? AND module_id = ?`,
        [userId, moduleId],
        (err, existing) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            const completed = progress >= 100;
            
            if (existing) {
                // Update existing record
                db.run(
                    `UPDATE user_progress SET 
                        progress = MAX(?, progress),
                        completed = ?,
                        score = MAX(?, score),
                        time_spent = time_spent + ?,
                        last_accessed = CURRENT_TIMESTAMP
                     WHERE user_id = ? AND module_id = ?`,
                    [progress, completed, score, timeSpent || 0, userId, moduleId],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }
                        res.json({ message: 'Progress updated' });
                    }
                );
            } else {
                // Create new record
                db.run(
                    `INSERT INTO user_progress 
                     (user_id, module_id, progress, completed, score, time_spent, last_accessed)
                     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [userId, moduleId, progress, completed, score, timeSpent || 0],
                    (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Database error' });
                        }
                        res.json({ message: 'Progress saved' });
                    }
                );
            }
        }
    );
});

// Save assessment result
router.post('/:moduleId/assessment', verifyToken, (req, res) => {
    const userId = req.userId;
    const moduleId = parseInt(req.params.moduleId);
    const { score, totalQuestions, correctAnswers, timeSpent, feedback } = req.body;
    
    if (isNaN(moduleId) || moduleId < 1 || moduleId > 15) {
        return res.status(400).json({ error: 'Invalid module ID' });
    }
    
    db.run(
        `INSERT INTO assessments 
         (user_id, module_id, score, total_questions, correct_answers, time_spent, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, moduleId, score, totalQuestions, correctAnswers, timeSpent, feedback],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            
            // Update module progress to mark as completed with score
            db.run(
                `UPDATE user_progress 
                 SET progress = 100, completed = 1, score = ?
                 WHERE user_id = ? AND module_id = ?`,
                [score, userId, moduleId],
                (err) => {
                    if (err) {
                        console.error('Error updating module progress:', err);
                    }
                    res.json({ 
                        message: 'Assessment saved',
                        assessmentId: this.lastID 
                    });
                }
            );
        }
    );
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