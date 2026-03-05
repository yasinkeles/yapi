require('dotenv').config();
const db = require('../src/config/database');
const User = require('../src/models/User');

(async () => {
    try {
        console.log("Initializing DB for password check...");
        await db.initialize();

        console.log("Verifying 'admin' with password 'admin'...");
        const user = await User.verifyPassword('admin', 'admin');

        if (user) {
            console.log("\n>>> SUCCESS: Password is correct for 'admin'. <<<\n");
        } else {
            console.log("\n>>> FAILURE: Password is INCORRECT for 'admin'. <<<\n");
        }

    } catch (e) {
        console.error("ERROR:", e);
    }
})();
