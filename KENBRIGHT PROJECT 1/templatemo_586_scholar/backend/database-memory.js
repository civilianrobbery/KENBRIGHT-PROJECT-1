// Simple in-memory database for testing
const bcrypt = require('bcryptjs');

class MemoryDatabase {
    constructor() {
        this.users = [];
        this.userProgress = [];
        this.assessments = [];
        this.initializeDemoData();
    }

    initializeDemoData() {
        // Create demo user
        const demoPassword = bcrypt.hashSync('demo123', 10);
        this.users.push({
            id: 1,
            email: 'demo@kenbright.com',
            name: 'Demo User',
            password: demoPassword,
            role: 'user',
            created_at: new Date().toISOString()
        });
        
        console.log('✅ In-memory database initialized with demo user');
    }

    async get(query, params) {
        console.log('DB GET:', query, params);
        
        try {
            if (query.includes('SELECT') && query.includes('users')) {
                if (query.includes('email')) {
                    return this.users.find(u => u.email === params[0]) || null;
                }
                if (query.includes('id')) {
                    return this.users.find(u => u.id === params[0]) || null;
                }
                if (query.includes('*')) {
                    return this.users[0] || null;
                }
            }
            if (query.includes('user_progress')) {
                return this.userProgress.find(p => 
                    p.user_id === params[0] && p.module_id === params[1]
                ) || null;
            }
            return null;
        } catch (error) {
            console.error('DB GET error:', error);
            return null;
        }
    }

    async all(query, params) {
        console.log('DB ALL:', query, params);
        
        try {
            if (query.includes('user_progress') && query.includes('ORDER BY module_id')) {
                return this.userProgress.filter(p => p.user_id === params[0]) || [];
            }
            if (query.includes('assessments') && query.includes('ORDER BY taken_at DESC')) {
                return this.assessments.filter(a => a.user_id === params[0]).slice(0, 10) || [];
            }
            return [];
        } catch (error) {
            console.error('DB ALL error:', error);
            return [];
        }
    }

    async run(query, params) {
        console.log('DB RUN:', query, params);
        
        try {
            if (query.includes('INSERT INTO users')) {
                const newId = this.users.length + 1;
                const user = {
                    id: newId,
                    email: params[0],
                    name: params[1],
                    password: params[2],
                    role: 'user',
                    created_at: new Date().toISOString()
                };
                this.users.push(user);
                return { lastID: newId, changes: 1 };
            }
            
            if (query.includes('INSERT INTO user_progress')) {
                // Check if exists first
                const existingIndex = this.userProgress.findIndex(p => 
                    p.user_id === params[0] && p.module_id === params[1]
                );
                
                if (existingIndex >= 0) {
                    // Update existing
                    this.userProgress[existingIndex] = {
                        ...this.userProgress[existingIndex],
                        progress: Math.max(params[2] || 0, this.userProgress[existingIndex].progress || 0),
                        completed: params[3] || this.userProgress[existingIndex].completed || 0,
                        score: Math.max(params[4] || 0, this.userProgress[existingIndex].score || 0),
                        time_spent: (this.userProgress[existingIndex].time_spent || 0) + (params[5] || 0),
                        last_accessed: new Date().toISOString()
                    };
                    return { lastID: this.userProgress[existingIndex].id, changes: 1 };
                } else {
                    // Create new
                    const newId = this.userProgress.length + 1;
                    const progress = {
                        id: newId,
                        user_id: params[0],
                        module_id: params[1],
                        progress: params[2] || 0,
                        completed: params[3] || 0,
                        score: params[4] || 0,
                        time_spent: params[5] || 0,
                        last_accessed: new Date().toISOString()
                    };
                    this.userProgress.push(progress);
                    return { lastID: newId, changes: 1 };
                }
            }
            
            if (query.includes('UPDATE user_progress')) {
                const existingIndex = this.userProgress.findIndex(p => 
                    p.user_id === params[4] && p.module_id === params[5]
                );
                
                if (existingIndex >= 0) {
                    this.userProgress[existingIndex] = {
                        ...this.userProgress[existingIndex],
                        progress: params[0],
                        completed: params[1],
                        score: params[2],
                        time_spent: (this.userProgress[existingIndex].time_spent || 0) + (params[3] || 0),
                        last_accessed: new Date().toISOString()
                    };
                    return { lastID: this.userProgress[existingIndex].id, changes: 1 };
                }
            }
            
            if (query.includes('INSERT INTO assessments')) {
                const newId = this.assessments.length + 1;
                const assessment = {
                    id: newId,
                    user_id: params[0],
                    module_id: params[1],
                    score: params[2],
                    total_questions: params[3],
                    correct_answers: params[4],
                    time_spent: params[5],
                    feedback: params[6],
                    taken_at: new Date().toISOString()
                };
                this.assessments.push(assessment);
                return { lastID: newId, changes: 1 };
            }
            
            return { lastID: 1, changes: 1 };
        } catch (error) {
            console.error('DB RUN error:', error);
            return { lastID: 1, changes: 0 };
        }
    }

    async exec(query) {
        console.log('DB EXEC:', query);
        // Just log table creation
        if (query.includes('CREATE TABLE')) {
            console.log('✅ Table creation simulated');
        }
        return;
    }
}

module.exports = MemoryDatabase;