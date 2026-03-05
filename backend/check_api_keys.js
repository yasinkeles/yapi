const db = require('./src/config/database');

(async () => {
    try {
        await db.initialize();
        const info = await db.query('PRAGMA table_info(api_keys)');
        console.log(JSON.stringify(info, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
