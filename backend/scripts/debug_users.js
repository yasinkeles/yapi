require('dotenv').config();
const path = require('path');
const db = require('../src/config/database');
const User = require('../src/models/User');

(async () => {
    try {
        console.log("Initializing DB...");
        await db.initialize();

        console.log("\n--- USER LIST ---");
        const users = await User.findAll();
        if (users.length === 0) {
            console.log("No users found!");
        } else {
            users.forEach(u => {
                console.log(`User: '${u.username}' (ID: ${u.id}) - Role: ${u.role}, Active: ${u.is_active}`);
            });
        }
        console.log("-----------------\n");

    } catch (e) {
        console.error("ERROR:", e);
    }
})();
