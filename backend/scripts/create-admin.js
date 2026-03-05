/**
 * Create Admin User Script
 * Creates a default admin user for initial login
 */

const bcrypt = require('bcrypt');
const db = require('../src/config/database');

async function createAdmin() {
  try {
    // Initialize database
    await db.initialize();
    console.log('Database initialized');

    // Check if admin already exists
    const existing = await db.queryOne(
      'SELECT id FROM users WHERE username = ?',
      ['admin']
    );

    if (existing) {
      console.log('Admin user already exists');
      process.exit(0);
    }

    // Create admin user
    const username = 'admin';
    const email = 'admin@example.com';
    const password = 'admin123'; // Default password - CHANGE THIS!
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [username, email, passwordHash, 'admin', 1, new Date().toISOString(), new Date().toISOString()]
    );

    console.log('\n✅ Admin user created successfully!');
    console.log('═══════════════════════════════════');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('═══════════════════════════════════');
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdmin();
