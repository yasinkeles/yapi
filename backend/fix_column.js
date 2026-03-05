const db = require('./src/config/database');

(async () => {
    try {
        await db.initialize();
        const sqlite = await db.getDatabase();
        try {
            sqlite.run("ALTER TABLE api_keys ADD COLUMN updated_at DATETIME");
            console.log('Successfully added updated_at to api_keys');
        } catch (e) {
            console.log('Error (maybe exists):', e.message);
        }
        db.saveDatabase();
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
