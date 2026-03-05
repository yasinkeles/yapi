/**
 * Database Initialization Script
 * Initializes the database using schema.sql
 */

const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const environment = require('../config/environment');

// Must mock config before requiring database if environment variables are not set properly in context
if (!process.env.SQLITE_PATH) process.env.SQLITE_PATH = './data/app.db';

const db = require('../config/database');
const logger = require('../utils/logger');

const init = async () => {
  try {
    console.log('Initializing database...');
    
    // Initialize DB (creates file, tables)
    await db.initialize();
    
    // Create default admin user if not exists
    const adminUser = await db.queryOne("SELECT * FROM users WHERE username = ?", ['admin']);
    
    if (!adminUser) {
      console.log('Creating default admin user...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await db.execute(
        `INSERT INTO users (username, email, password_hash, role, is_active) 
         VALUES (?, ?, ?, ?, ?)`,
        ['admin', 'admin@example.com', hashedPassword, 'admin', 1]
      );
      
      console.log('Default admin user created.');
      console.log('Username: admin');
      console.log('Password: admin123');
      console.log('PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN!');
    } else {
      console.log('Admin user already exists.');
    }
    
    console.log('Database initialization completed successfully.');
    
    // Create logs directory if not exists
    const logDir = path.dirname(environment.logFilePath);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        console.log(`Created logs directory: ${logDir}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
};

init();
