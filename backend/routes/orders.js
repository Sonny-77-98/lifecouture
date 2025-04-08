const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env.admin'});

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await query('SELECT * FROM admin_users WHERE id = ? AND role = ?', 
      [decoded.id, 'admin']
    );
    
    if (user.length === 0) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

router.get('/count', async (req, res) => {
  try {
    const countResult = await query('SELECT COUNT(*) as total FROM Orders');
    res.json({ count: countResult[0].count });
  } catch (error) {
    console.error('Error counting orders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    console.log('Orders GET route handler called!');
    console.log('Request query params:', req.query);
    
    let sql = `
      SELECT o.*, u.usFname, u.usLname, u.usEmail 
      FROM Orders o
      JOIN User u ON o.userID = u.usID
    `;

    const params = [];
    
    if (req.query.status) {
      sql += ' WHERE o.orderStat = ?';
      console.log('Filtering by status:', req.query.status);
      params.push(req.query.status);
    }
    
    sql += ' ORDER BY o.orderCreatedAt DESC';
    
    if (req.query.limit) {
      const limit = parseInt(req.query.limit);
      sql += ` LIMIT ${limit}`;
      
      if (req.query.offset) {
        const offset = parseInt(req.query.offset);
        sql += ` OFFSET ${offset}`;
      }
    }
    
    const orders = await query(sql, params);
    const countResult = await query('SELECT COUNT(*) as total FROM Orders');
    const total = countResult[0].total;
    
    res.json({
      orders,
      total,
      page: req.query.offset ? Math.floor(parseInt(req.query.offset) / parseInt(req.query.limit)) + 1 : 1,
      limit: req.query.limit ? parseInt(req.query.limit) : total
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const orderResult = await query(`
      SELECT o.*
      FROM Orders o
      WHERE o.orderID = ?
    `, [req.params.id]);
    
    if (orderResult.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const order = orderResult[0];
    // Modify this query to include price information
    const orderItems = await query(`
      SELECT oi.*, oi.prodUPrice as price, pv.varSKU as sku, p.prodTitle, p.prodID
      FROM OrderItems oi
      JOIN ProductVariants pv ON oi.varID = pv.varID
      JOIN Product p ON pv.prodID = p.prodID
      WHERE oi.orderID = ?
    `, [req.params.id]);
    
    const userResult = await query(`
      SELECT u.*, ua.*
      FROM User u
      LEFT JOIN UserAddresses ua ON u.usAdID = ua.usAdID
      WHERE u.usID = ?
    `, [order.userID]);
    
    const user = userResult.length > 0 ? userResult[0] : null;
    
    res.json({
      ...order,
      items: orderItems,
      user: user,
      address: user ? {
        usAdStr: user.usAdStr,
        usAdCity: user.usAdCity,
        usAdState: user.usAdState,
        usAdPCode: user.usAdPCode,
        usAdCountry: user.usAdCountry
      } : null
    });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ROUTES - Protected by authentication middleware

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { items, userID, orderTotalAmt } = req.body;
    
    if (!items || !items.length || !userID || !orderTotalAmt) {
      return res.status(400).json({ 
        message: 'Items, user ID, and total amount are required' 
      });
    }

    const userCheck = await query('SELECT usID FROM User WHERE usID = ?', [userID]);
    if (userCheck.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const orderResult = await query(
      'INSERT INTO Orders (orderStat, orderTotalAmt, orderCreatedAt, orderUpdatedAt, userID) VALUES (?, ?, NOW(), NOW(), ?)',
      ['Pending', orderTotalAmt, userID]
    );
    
    const orderID = orderResult.insertId;
    
    for (const item of items) {
      // Get the price from the variant
      let price = item.price;
      
      // If price isn't provided, fetch it from the variant
      if (!price) {
        const priceResult = await query(
          'SELECT varPrice FROM ProductVariants WHERE varID = ?',
          [item.varID]
        );
        
        price = priceResult.length > 0 ? priceResult[0].varPrice : 83.54;
      }
      
      await query(
        'INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID) VALUES (?, ?, ?, ?)',
        [item.quantity, price, orderID, item.varID]
      );
      
      if (item.updateInventory) {
        await query(
          'UPDATE Inventory i JOIN ProductVariants pv ON i.varID = pv.varID SET i.invQty = i.invQty - ? WHERE pv.varID = ?',
          [item.quantity, item.varID]
        );
      }
    }
    
    res.status(201).json({
      message: 'Order created successfully',
      orderID
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update an existing order
router.put('/:id', authMiddleware, async (req, res) => {
  let connection;
  try {
    const { userID, orderStat, orderTotalAmt, items } = req.body;
    
    if (!userID || !orderStat || !orderTotalAmt || !items) {
      return res.status(400).json({ 
        message: 'User ID, status, total amount, and items are required' 
      });
    }
    
    // Verify the order exists
    const orderCheck = await query('SELECT orderID FROM Orders WHERE orderID = ?', [req.params.id]);
    if (orderCheck.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Get a database connection for transaction
    connection = await require('../config/db').pool.getConnection();
    await connection.beginTransaction();
    
    // Update order details
    await connection.execute(
      'UPDATE Orders SET orderStat = ?, orderTotalAmt = ?, userID = ?, orderUpdatedAt = NOW() WHERE orderID = ?',
      [orderStat, orderTotalAmt, userID, req.params.id]
    );
    
    // Delete existing order items
    await connection.execute('DELETE FROM OrderItems WHERE orderID = ?', [req.params.id]);
    
    // Add new order items
    for (const item of items) {
      await connection.execute(
        'INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID) VALUES (?, ?, ?, ?)',
        [item.quantity, item.price, req.params.id, item.varID]
      );
    }
    
    await connection.commit();
    
    res.json({
      message: 'Order updated successfully',
      orderID: req.params.id
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }
    
    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    const orderResult = await query('SELECT * FROM Orders WHERE orderID = ?', [req.params.id]);
    
    if (orderResult.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    await query(
      'UPDATE Orders SET orderStat = ?, orderUpdatedAt = NOW() WHERE orderID = ?',
      [status, req.params.id]
    );
    
    res.json({ 
      message: 'Order status updated successfully',
      orderID: req.params.id,
      status: status
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const orderResult = await query('SELECT * FROM Orders WHERE orderID = ?', [req.params.id]);
    
    if (orderResult.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    await query('DELETE FROM OrderItems WHERE orderID = ?', [req.params.id]);
    
    await query('DELETE FROM Orders WHERE orderID = ?', [req.params.id]);
    
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;