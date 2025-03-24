// backend/config/db.js
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.admin
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.admin') });

// Database connection pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0
});

// Helper function to execute SQL queries
async function query(sql, params) {
  try {
    console.log(`Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Test connection
async function testConnection() {
  try {
    console.log('Testing database connection...');
    console.log(`Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}`);
    
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Check if database tables exist
async function checkDatabaseTables() {
  try {
    console.log('Checking database tables...');
    
    // Get list of tables in the database
    const tables = await query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = ?`, 
      [process.env.DB_NAME]
    );
    
    const tableNames = tables.map(t => t.TABLE_NAME);
    console.log('Existing tables:', tableNames.join(', '));
    
    const requiredTables = [
      'Product', 'Categories', 'ProductCategories', 'Vendor',
      'ProductImages', 'ProductAttributes', 'ProductVariants',
      'VariantAttributesValues', 'Inventory', 'UserAddresses',
      'User', 'ShoppingCart', 'CartItems', 'Orders', 'OrderItems'
    ];
    
    const missingTables = requiredTables.filter(table => !tableNames.includes(table));
    
    if (missingTables.length > 0) {
      console.warn('Missing tables:', missingTables.join(', '));
      console.warn('Please run the SQL scripts to create the missing tables.');
      return false;
    }
    
    console.log('All required tables exist');
    return true;
  } catch (error) {
    console.error('Error checking database tables:', error);
    return false;
  }
}

module.exports = {
  query,
  testConnection,
  checkDatabaseTables,
  pool
};