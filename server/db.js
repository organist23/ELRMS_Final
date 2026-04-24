const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// 1. Detect environment and determine .env path
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const envPath = isDev 
  ? path.join(__dirname, '.env')                 // Dev: project folder
  : path.join(process.resourcesPath, '.env');    // Prod: EXE resources folder

// 2. Load .env with explicit path
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

// 3. Initialize Pool with robust fallbacks
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD === undefined ? 'admin' : process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'elrms_v2',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool;
