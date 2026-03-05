/**
 * Setup Script
 * Initializes the Multi-Database API Service
 * - Creates necessary directories
 * - Initializes SQLite database
 * - Creates admin user
 * - Generates .env file with secure keys
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, colors.bright + colors.blue);
  console.log('='.repeat(60));
}

function generateRandomKey(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

async function setup() {
  try {
    logSection('Multi-Database API Service - Setup');

    // Step 1: Create directories
    logSection('Step 1: Creating Directories');

    const directories = [
      'backend/data',
      'backend/logs',
      'backend/src/config',
      'backend/src/database',
      'backend/src/middleware',
      'backend/src/services',
      'backend/src/adapters',
      'backend/src/models',
      'backend/src/controllers',
      'backend/src/routes/admin',
      'backend/src/utils',
      'backend/src/validators'
    ];

    directories.forEach(dir => {
      const fullPath = path.join(__dirname, '..', dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        log(`✓ Created: ${dir}`, colors.green);
      } else {
        log(`○ Already exists: ${dir}`, colors.yellow);
      }
    });

    // Step 2: Check if .env already exists
    logSection('Step 2: Environment Configuration');

    const envPath = path.join(__dirname, '../backend/.env');
    const envExamplePath = path.join(__dirname, '../backend/.env.example');

    if (fs.existsSync(envPath)) {
      log('⚠️  .env file already exists!', colors.yellow);
      log('If you want to regenerate it, please delete it first and run setup again.', colors.yellow);
    } else {
      log('Generating secure .env file...', colors.blue);

      // Generate secure random keys
      const jwtSecret = generateRandomKey(64);
      const refreshSecret = generateRandomKey(64);
      const encryptionKey = generateRandomKey(64);
      const encryptionSalt = generateRandomKey(32);

      // Read .env.example
      let envTemplate = fs.readFileSync(envExamplePath, 'utf8');

      // Replace placeholders with generated keys
      envTemplate = envTemplate
        .replace('your-secret-key-change-this-to-random-64-char-string', jwtSecret)
        .replace('your-refresh-secret-change-this-to-random-64-char-string', refreshSecret)
        .replace('your-encryption-key-change-this-to-random-64-char-string', encryptionKey)
        .replace('your-salt-change-this-to-random-32-char-string', encryptionSalt);

      // Write .env file
      fs.writeFileSync(envPath, envTemplate);

      log('✓ .env file created with secure random keys', colors.green);
    }

    // Step 3: Initialize database
    logSection('Step 3: Initializing Database');

    // We need to load the database config after .env is created
    require('dotenv').config({ path: envPath });

    const Database = require('better-sqlite3');
    const dbPath = path.join(__dirname, '../backend/data/app.db');

    const db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '../backend/src/database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    db.exec(schema);

    log('✓ Database initialized successfully', colors.green);
    log(`  Location: ${dbPath}`, colors.blue);

    // Step 4: Create admin user
    logSection('Step 4: Creating Admin User');

    const bcrypt = require('bcrypt');

    // Check if admin user already exists
    const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');

    let adminPassword;

    if (existingAdmin) {
      log('⚠️  Admin user already exists!', colors.yellow);
      log('Skipping admin user creation.', colors.yellow);
    } else {
      // Generate random password for admin
      adminPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Insert admin user
      const insertAdmin = db.prepare(`
        INSERT INTO users (username, email, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?)
      `);

      const result = insertAdmin.run(
        'admin',
        'admin@localhost',
        hashedPassword,
        'admin',
        1
      );

      log('✓ Admin user created successfully', colors.green);
    }

    db.close();

    // Step 5: Display summary
    logSection('Setup Complete!');

    log('\n🎉 Multi-Database API Service has been set up successfully!', colors.bright + colors.green);

    if (adminPassword) {
      log('\n' + '⚠️  IMPORTANT - Save these credentials!'.repeat(1), colors.bright + colors.red);
      console.log('\n' + '─'.repeat(60));
      log('Admin Credentials:', colors.bright);
      log(`  Username: admin`, colors.yellow);
      log(`  Password: ${adminPassword}`, colors.yellow);
      console.log('─'.repeat(60));
      log('\n⚠️  This password will NOT be shown again!', colors.red);
      log('Please save it in a secure location.\n', colors.red);
    }

    log('\nNext steps:', colors.bright);
    log('1. cd backend && npm install', colors.blue);
    log('2. cd frontend && npm install', colors.blue);
    log('3. Start development:', colors.blue);
    log('   - Windows: scripts\\start-dev.bat', colors.blue);
    log('   - Linux/Mac: bash scripts/start-dev.sh', colors.blue);

    log('\nDocumentation:', colors.bright);
    log('  - Backend will run on: http://localhost:3000', colors.blue);
    log('  - Frontend will run on: http://localhost:5173', colors.blue);

  } catch (error) {
    log('\n❌ Setup failed!', colors.bright + colors.red);
    log(`Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  }
}

// Run setup
setup();
