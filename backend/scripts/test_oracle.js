require('dotenv').config();
const oracledb = require('oracledb');
const path = require('path');

async function test() {
    console.log("Starting Oracle Test...");
    console.log("Arch:", process.arch);
    console.log("Platform:", process.platform);

    const libDir = path.join(__dirname, '../lib/oracle');
    console.log("Lib Dir:", libDir);

    try {
        oracledb.initOracleClient({ libDir });
        console.log("SUCCESS: Oracle Client Initialized!");
    } catch (err) {
        console.error("FAILURE: Oracle Client Init Failed!");
        console.error(err.message);
        console.error("If the error is DPI-1047, you are missing VS C++ Redistributables.");
    }
}

test();
