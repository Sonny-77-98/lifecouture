const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Additional debugging
console.log('Attempting to connect to database at cpanel.cikeys.com:3306');
const pool = mysql.createPool({
  host: 'cpanel.cikeys.com',  // Use the exact hostname from Workbench
  user: 'duclecik_testuser',
  password: 'duchongle@98',
  database: 'duclecik_LifeCouture',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

// Simple API endpoint to get products
app.get('/api/products', async (req, res) => {
  try {
    console.log('Executing database query...');
    const [products] = await pool.query('SELECT * FROM Product');
    console.log(`Retrieved ${products.length} products from database`);
    res.json(products);
  } catch (error) {
    console.error('Database error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage
    });
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve HTML at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});