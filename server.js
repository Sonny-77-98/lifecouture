require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 3000;
const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;
const DB_CONNECTION_LIMIT = process.env.DB_CONNECTION_LIMIT || 10;

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT,
  waitForConnections: true,
  connectionLimit: DB_CONNECTION_LIMIT,
});

// Routes
// Inventory Routes
const inventoryRoutes = require('./backend/routes/inventory');
app.use('/api/inventory', inventoryRoutes);

// Authentication Routes
const { router: authRouter } = require('./backend/routes/authentication');
app.use('/api/auth', authRouter);

// Category Routes
const categoryRoutes = require('./backend/routes/categories');
app.use('/api/categories', categoryRoutes);

// Product Routes
const productsRouter = require('./backend/routes/products');
app.use('/api/products', productsRouter);

// Order Routes
const ordersRoutes = require('./backend/routes/orders');
app.use('/api/orders', ordersRoutes);

// User Routes
const userRoutes = require('./backend/routes/users');
app.use('/api/users', userRoutes);

// Variant Routes
const variantsRouter = require('./backend/routes/variants');
app.use('/api/variants', variantsRouter);

// API Routes
// Get products from the database
app.get('/api/products', async (req, res) => {
  try {
    const [products] = await pool.query('SELECT * FROM Product');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products from DB:', error);
    res.status(500).json({ error: 'Failed to fetch products', details: error.message });
  }
});

app.post('/api/cart', async (req, res) => {
  const { userID, prodID, quantity } = req.body;
  try {
    await pool.query(
      'INSERT INTO Cart (userID, prodID, quantity) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE quantity = quantity + ?',
      [userID, prodID, quantity, quantity]
    );
    res.json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    res.status(500).json({ error: 'Failed to add item to cart', details: error.message });
  }
});

app.get('/api/cart/:userID', async (req, res) => {
  const { userID } = req.params;
  try {
    const [cart] = await pool.query('SELECT * FROM Cart WHERE userID = ?', [userID]);
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart', details: error.message });
  }
});

app.delete('/api/cart/:userID/:prodID', async (req, res) => {
  const { userID, prodID } = req.params;
  try {
    await pool.query('DELETE FROM Cart WHERE userID = ? AND prodID = ?', [userID, prodID]);
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing item from cart:', error);
    res.status(500).json({ error: 'Failed to remove item from cart', details: error.message });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { userID, items, totalAmount } = req.body;
  try {
    const [orderResult] = await pool.query('INSERT INTO Orders (userID, totalAmount) VALUES (?, ?)', [userID, totalAmount]);
    const orderID = orderResult.insertId;

    for (const item of items) {
      await pool.query('INSERT INTO OrderItems (orderID, prodID, quantity) VALUES (?, ?, ?)', [orderID, item.prodID, item.quantity]);
    }

    await pool.query('DELETE FROM Cart WHERE userID = ?', [userID]);

    res.json({ message: 'Order placed successfully', orderID });
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Failed to place order', details: error.message });
  }
});

// Serve static files for production
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
