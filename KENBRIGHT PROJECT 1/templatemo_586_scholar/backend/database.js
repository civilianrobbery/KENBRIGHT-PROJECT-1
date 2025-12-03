const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// For Render deployment, use in-memory database
// For local development, use file database
const isProduction = process.env.NODE_ENV === 'production';
const dbPath = isProduction 
    ? ':memory:'  // In-memory for Render (ephemeral)
    : path.join(__dirname, 'kenbright.db');

console.log(`📁 Database path: ${dbPath}`);
console.log(`🌍 Environment: ${isProduction ? 'Production' : 'Development'}`);

// Create database connection
const db = new Database(dbPath);

// Initialize database tables
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS user_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT 0,
        score INTEGER DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        last_accessed DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id),
        UNIQUE(user_id, module_id)
    )
`);

db.exec(`
    CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        module_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        time_spent TEXT,
        feedback TEXT,
        taken_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
`);

// Create demo user if not exists
try {
    const demoEmail = 'demo@kenbright.com';
    const demoPassword = bcrypt.hashSync('demo123', 10);
    
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
    
    if (!user) {
        db.prepare(
            'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)'
        ).run(demoEmail, 'Demo User', demoPassword, 'user');
        console.log('✅ Demo user created');
    } else {
        console.log('✅ Demo user already exists');
    }
} catch (error) {
    console.error('Error creating demo user:', error);
}

console.log('✅ Database initialized successfully');

module.exports = db;