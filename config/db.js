// db.js - Database connection configuration
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'cpanel.cikeys.com',  // Use the exact hostname from Workbench
  user: 'duclecik_testuser',
  password: 'duchongle@98',
  database: 'duclecik_LifeCouture',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('Database connection successful to duclecik_LifeCouture at cpanel.cikeys.com');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  query,
  testConnection
};