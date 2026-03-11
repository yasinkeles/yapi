// Patch script to add missing columns to page_versions
// Run: node scripts/patch-page-versions.js

const db = require('../src/config/database');

(async () => {
  try {
    await db.initialize();
    console.log('DB initialized');

    // SQLite and Postgres compatible ADD COLUMN IF NOT EXISTS (SQLite will ignore IF NOT EXISTS but accept ADD COLUMN)
    const statements = [
      "ALTER TABLE page_versions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW()",
      "ALTER TABLE page_versions ADD COLUMN updated_by INTEGER"
    ];

    for (const sql of statements) {
      try {
        await db.execute(sql);
        console.log('Applied:', sql);
      } catch (err) {
        if (err.message && err.message.includes('duplicate column name')) {
          console.log('Already exists, skipping:', sql);
        } else if (err.message && err.message.includes('already exists')) {
          console.log('Already exists, skipping:', sql);
        } else {
          console.warn('Error running', sql, err.message || err);
        }
      }
    }

    // Verify columns
    try {
      const check = await db.query("SELECT updated_at, updated_by FROM page_versions LIMIT 1");
      console.log('Verification query ok, row count:', check.length);
    } catch (err) {
      console.warn('Verification failed:', err.message || err);
    }

    db.close?.();
    console.log('Done.');
  } catch (err) {
    console.error('Patch failed:', err);
    db.close?.();
    process.exit(1);
  }
})();
