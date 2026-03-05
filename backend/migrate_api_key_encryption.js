const db = require('./src/config/database');
const logger = require('./src/utils/logger').createModuleLogger('Migration');

async function runMigration() {
  try {
    logger.info('Starting API Key encryption migration...');

    // Add encrypted_key column
    try {
      await db.execute('ALTER TABLE api_keys ADD COLUMN encrypted_key TEXT');
      logger.info('Added encrypted_key column to api_keys table');
    } catch (error) {
      if (error.message.includes('duplicate column name')) {
        logger.info('encrypted_key column already exists');
      } else {
        throw error;
      }
    }

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
