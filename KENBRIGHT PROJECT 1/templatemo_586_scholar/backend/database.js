const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'kenbright.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // User progress table
    db.run(`
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

    // Assessment results table
    db.run(`
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
    const demoEmail = 'demo@kenbright.com';
    const demoPassword = bcrypt.hashSync('demo123', 10);
    
    db.get('SELECT id FROM users WHERE email = ?', [demoEmail], (err, row) => {
        if (err) {
            console.error('Error checking demo user:', err);
            return;
        }
        
        if (!row) {
            db.run(
                'INSERT INTO users (email, name, password, role) VALUES (?, ?, ?, ?)',
                [demoEmail, 'Demo User', demoPassword, 'user'],
                (err) => {
                    if (err) {
                        console.error('Error creating demo user:', err);
                    } else {
                        console.log('✅ Demo user created');
                    }
                }
            );
        }
    });

    console.log('✅ Database tables initialized');
}

module.exports = db;