require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Database pool setup
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
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true
}));
app.use(express.static(path.join(__dirname, 'build')));

// Routes Setup - Using modular route files
app.use('/api/inventory', require('./backend/routes/inventory'));
app.use('/api/auth', require('./backend/routes/authentication').router);
app.use('/api/categories', require('./backend/routes/categories'));
app.use('/api/products', require('./backend/routes/products'));
app.use('/api/orders', require('./backend/routes/orders'));
app.use('/api/users', require('./backend/routes/users'));
app.use('/api/variants', require('./backend/routes/variants'));
app.use('/api', require('./backend/routes/productImages'));

// Test route
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1');
    res.json({ message: 'Database connection successful', rows });
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Fetch US states and tax rates
app.get('/api/states', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT stateID, stateName, taxRatesA FROM States');
    
    console.log('Raw state data from DB:', rows);

    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(rows));
  } catch (error) {
    console.error('Error fetching states:', error);
    res.status(500).json({ error: 'Failed to fetch states', details: error.message });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { items, name, email, phone, address, state, taxRate, shippingCost, totalAmount } = req.body;
  let connection;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Cart is empty or invalid format.' });
  }

  try {
    // Validate items and calculate total
    let orderTotal = totalAmount || 0;
    
    for (const item of items) {
      if (!item.varID) throw new Error(`No variant selected for product ${item.prodID}`);
      
      const [variant] = await pool.query(
        'SELECT varPrice FROM ProductVariants WHERE varID = ? LIMIT 1', 
        [item.varID]
      );
      
      if (variant.length === 0) throw new Error(`Variant ${item.varID} not found.`);
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Parse name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts.shift() || '';
    const lastName = nameParts.join(' ') || '';
    
    // First, create the user record
    const [userInsert] = await connection.query(
      'INSERT INTO User (usFname, usLname, usEmail, usPNum, usAdID, usPassword, usRole) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone, 1, 'default_placeholder', 'customer']
    );
    
    const userID = userInsert.insertId;
    
    // Then create the address record with the userID
    const [addressInsert] = await connection.query(
      'INSERT INTO UserAddresses (usAdType, usAdStr, usAdCity, usAdState, usAdPCode, usAdCountry, usAdIsDefault, usID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      ['shipping', address, state.split(',')[0].trim(), state.split(',')[1]?.trim() || state, 
       address.match(/\d{5}(-\d{4})?/) ? address.match(/\d{5}(-\d{4})?/)[0] : '00000', 
       'USA', true, userID]
    );
    
    const addressID = addressInsert.insertId;
    
    // Update the user record to point to the newly created address
    await connection.query(
      'UPDATE User SET usAdID = ? WHERE usID = ?',
      [addressID, userID]
    );

    // Create order
    const [orderResult] = await connection.query(
      'INSERT INTO Orders (userID, orderTotalAmt, orderStat, orderCreatedAt, orderUpdatedAt, taxRate, shippingCost) VALUES (?, ?, "Pending", NOW(), NOW(), ?, ?)',
      [userID, orderTotal, taxRate || 8.25, shippingCost || 599]
    );
    
    const orderID = orderResult.insertId;

    // Create order items
    for (const item of items) {
      const [variant] = await connection.query(
        'SELECT varPrice FROM ProductVariants WHERE varID = ? LIMIT 1', 
        [item.varID]
      );
      
      const price = variant[0].varPrice;
      const quantity = item.quantity || 1;

      await connection.query(
        'INSERT INTO OrderItems (orderID, varID, orderVarQty, prodUPrice) VALUES (?, ?, ?, ?)',
        [orderID, item.varID, quantity, price]
      );
      
      // Update inventory (optional)
      await connection.query(
        'UPDATE Inventory SET invQty = invQty - ? WHERE varID = ?',
        [quantity, item.varID]
      );
    }

    await connection.commit();
    res.status(200).json({ message: 'Order placed successfully', orderID, userID, addressID });
  } catch (error) {
    console.error('Error during checkout:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ message: 'Error placing order', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Cart: add to cart
app.post('/api/cart', async (req, res) => {
  const { userID, prodID, quantity } = req.body;
  if (!userID || !prodID || !quantity) {
    return res.status(400).json({ message: 'Missing userID, prodID, or quantity.' });
  }

  try {
    await pool.query(
      `INSERT INTO Cart (userID, prodID, quantity) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
      [userID, prodID, quantity, quantity]
    );
    res.json({ message: 'Item added to cart' });
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: 'Failed to add to cart', details: error.message });
  }
});

// Cart: get items
app.get('/api/cart/:userID', async (req, res) => {
  const { userID } = req.params;
  try {
    const [cart] = await pool.query('SELECT * FROM CartItems WHERE userID = ?', [userID]);
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart', details: error.message });
  }
});

// Cart: remove item
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Server startup with IP address detection
function getIPAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in interfaces) {
    const interfaceInfo = interfaces[interfaceName];
    for (const info of interfaceInfo) {
      if (!info.internal && info.family === 'IPv4') {
        addresses.push(info.address);
      }
    }
  }
  
  return addresses;
}

function startServer() {
  const addresses = getIPAddresses();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n=== Server Started Successfully ===`);
    console.log(`Server is running on port: ${PORT}`);
    
    if (addresses.length > 0) {
      console.log('\nServer accessible at:');
      addresses.forEach(address => {
        console.log(`http://${address}:${PORT}`);
      });
    } else {
      console.log(`http://localhost:${PORT}`);
    }
    
    console.log('\nPress Ctrl+C to stop the server');
    console.log('=====================================\n');
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Try a different port.`);
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}

startServer();