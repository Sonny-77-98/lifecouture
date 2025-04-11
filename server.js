require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database config
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
});

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// Routes Setup
app.use('/api/inventory', require('./backend/routes/inventory'));
app.use('/api/auth', require('./backend/routes/authentication').router);
app.use('/api/categories', require('./backend/routes/categories'));
app.use('/api/products', require('./backend/routes/products'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/users', require('./backend/routes/users'));
app.use('/api/variants', require('./backend/routes/variants'));

// Checkout process
app.post('/api/checkout', async (req, res) => {
  const { items, name, email, phone } = req.body;

  let connection;
  try {
    // Calculate totalAmount
    let totalAmount = 0;
    for (const item of items) {
      const [variant] = await pool.query(
        'SELECT varPrice FROM ProductVariants WHERE varID = ? LIMIT 1',
        [item.prodID]
      );

      if (variant.length === 0) throw new Error(`Price for variant ${item.prodID} not found.`);
      const price = variant[0].varPrice;
      const quantity = item.quantity || 1;
      totalAmount += price * quantity;
    }

    // Start transaction
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Always create new user
    const [firstName, lastName] = name.split(' ');
    const [userInsert] = await connection.query(
      'INSERT INTO User (usFname, usLname, usEmail, usPNum, usAdID, usPassword, usRole) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstName || '', lastName || '', email, phone, 1, 'default', 'customer']
    );

    const userID = userInsert.insertId;

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO Orders (userID, orderTotalAmt, orderSTAT, orderCreatedAt, orderUpdatedAt) VALUES (?, ?, "Pending", NOW(), NOW())',
      [userID, totalAmount]
    );
    const orderID = orderResult.insertId;

    // Add OrderItems
    for (const item of items) {
      const [variant] = await connection.query(
        'SELECT varPrice FROM ProductVariants WHERE varID = ? LIMIT 1',
        [item.prodID]
      );
      const price = variant[0].varPrice;
      const quantity = item.quantity || 1;
      await connection.query(
        'INSERT INTO OrderItems (orderID, varID, orderVarQty, prodUPrice) VALUES (?, ?, ?, ?)',
        [orderID, item.prodID, quantity, price]
      );
    }

    await connection.commit();
    connection.release();

    res.status(200).json({ message: 'Order placed successfully', orderID });
  } catch (error) {
    console.error('Error during checkout:', error);
    if (connection) {
      await connection.rollback();
      connection.release();
    }
    res.status(500).json({ message: 'Error placing order', error: error.message });
  }
});

// Get all products
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM Product');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Cart endpoints
app.post('/api/cart', async (req, res) => {
  const { userID, prodID, quantity } = req.body;
  try {
    await pool.query(
      `INSERT INTO Cart (userID, prodID, quantity)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userID, prodID, quantity, quantity]
    );
    res.json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

app.get('/api/cart/:userID', async (req, res) => {
  try {
    const [cart] = await pool.query('SELECT * FROM Cart WHERE userID = ?', [req.params.userID]);
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.delete('/api/cart/:userID/:prodID', async (req, res) => {
  const { userID, prodID } = req.params;
  try {
    await pool.query('DELETE FROM Cart WHERE userID = ? AND prodID = ?', [userID, prodID]);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// Fallback for production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
