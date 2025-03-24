const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env.admin'});

// Authentication middleware - verify token
const authMiddleware = async (req, res, next) => {
  // Get token from header
  const token = req.header('x-auth-token');
  
  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query('SELECT * FROM User WHERE usID = ? AND usRole = ?', [decoded.id, 'admin']);
    
    if (user.length === 0) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Add user info to request
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token validation error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// PUBLIC ROUTES

router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT p.*, 
             GROUP_CONCAT(DISTINCT pc.catID) as categoryIds
      FROM Product p
      LEFT JOIN ProductCategories pc ON p.prodID = pc.prodID
    `;
    
    const params = [];
    const whereConditions = [];
    
    // Category filter
    if (req.query.category) {
      whereConditions.push(`
        p.prodID IN (
          SELECT prodID FROM ProductCategories 
          WHERE catID = ?
        )
      `);
      params.push(req.query.category);
    }
    
    // Status filter
    if (req.query.status) {
      whereConditions.push('p.prodStat = ?');
      params.push(req.query.status);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' GROUP BY p.prodID';
 
    sql += ' ORDER BY p.prodID DESC';
    
    const products = await query(sql, params);

    const transformedProducts = await Promise.all(products.map(async (product) => {
      const images = await query('SELECT * FROM ProductImages WHERE prodID = ? LIMIT 1', [product.prodID]);
 
      if (product.categoryIds) {
        product.categories = product.categoryIds.split(',').map(id => parseInt(id));
      } else {
        product.categories = [];
      }
      if (images.length > 0) {
        product.imageUrl = images[0].imgURL;
        product.imageAlt = images[0].imgAlt;
      }
      
      delete product.categoryIds;
      return product;
    }));
    
    res.json(transformedProducts);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/count', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM Product');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Error counting products:', error);
    res.status(500).json({ error: error.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const product = await query('SELECT * FROM Product WHERE prodID = ?', [req.params.id]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const productData = product[0];

    const categories = await query(`
      SELECT c.* 
      FROM Categories c
      JOIN ProductCategories pc ON c.catID = pc.catID
      WHERE pc.prodID = ?
    `, [req.params.id]);

    
    const attributes = await query(`
      SELECT pa.*, a.attName 
      FROM ProductAttributes pa
      JOIN ProductAttributes a ON pa.attID = a.attID
      WHERE pa.prodID = ?
    `, [req.params.id]);
    
    // Get product images
    const images = await query('SELECT * FROM ProductImages WHERE prodID = ?', [req.params.id]);
    
    productData.categories = categories;
    productData.attributes = attributes;
    productData.images = images;
    
    res.json(productData);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get product categories
router.get('/:id/categories', async (req, res) => {
  try {
    const sql = `
      SELECT c.* 
      FROM Categories c
      JOIN ProductCategories pc ON c.catID = pc.catID
      WHERE pc.prodID = ?
    `;
    
    const categories = await query(sql, [req.params.id]);
    res.json(categories);
  } catch (error) {
    console.error('Error fetching product categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ROUTES - Protected by authentication middleware

// Create a new product with categories and attributes
router.post('/', authMiddleware, async (req, res) => {
  let connection;
  try {
    // Parse JSON strings if needed
    let categories = req.body.categories;
    let attributes = req.body.attributes;
    
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (e) {
        categories = [];
      }
    }
    
    if (typeof attributes === 'string') {
      try {
        attributes = JSON.parse(attributes);
      } catch (e) {
        attributes = {};
      }
    }
    
    const { prodTitle, prodDesc, prodURL, prodStat, imageUrl, imageAlt } = req.body;
    
    // Validate input
    if (!prodTitle || !prodDesc) {
      return res.status(400).json({ message: 'Product title and description are required' });
    }
    
    // Get a connection for transaction
    connection = await require('../config/db').getConnection();
    await connection.beginTransaction();
    
    // Insert product
    const [productResult] = await connection.execute(
      'INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) VALUES (?, ?, ?, ?)',
      [prodTitle, prodDesc, prodURL || prodTitle.toLowerCase().replace(/\s+/g, '-'), prodStat || 'active']
    );
    
    const productId = productResult.insertId;
    
    // Add image URL if provided
    if (imageUrl) {
      await connection.execute(
        'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
        [imageUrl, imageAlt || prodTitle, productId]
      );
    }
    
    // Insert categories if provided
    if (categories && categories.length > 0) {
      for (const catID of categories) {
        await connection.execute(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, catID]
        );
      }
    }
    
    // Insert attributes if provided
    if (attributes && Object.keys(attributes).length > 0) {
      for (const [attID, value] of Object.entries(attributes)) {
        if (value) {
          await connection.execute(
            'INSERT INTO ProductAttributes (prodID, attID, value) VALUES (?, ?, ?)',
            [productId, attID, value]
          );
        }
      }
    }
    
    // Commit transaction
    await connection.commit();
    
    res.status(201).json({
      message: 'Product created successfully',
      productId: productId
    });
  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update an existing product with categories and attributes
router.put('/:id', authMiddleware, async (req, res) => {
  let connection;
  try {
    // Parse JSON strings if needed
    let categories = req.body.categories;
    let attributes = req.body.attributes;
    
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (e) {
        categories = [];
      }
    }
    
    if (typeof attributes === 'string') {
      try {
        attributes = JSON.parse(attributes);
      } catch (e) {
        attributes = {};
      }
    }
    
    const { prodTitle, prodDesc, prodURL, prodStat, imageUrl, imageAlt } = req.body;
    const productId = req.params.id;
    
    // Validate input
    if (!prodTitle || !prodDesc) {
      return res.status(400).json({ message: 'Product title and description are required' });
    }
    
    // Check if product exists
    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get a connection for transaction
    connection = await require('../config/db').getConnection();
    await connection.beginTransaction();
    
    // Update product
    await connection.execute(
      'UPDATE Product SET prodTitle = ?, prodDesc = ?, prodURL = ?, prodStat = ? WHERE prodID = ?',
      [prodTitle, prodDesc, prodURL || prodTitle.toLowerCase().replace(/\s+/g, '-'), prodStat || 'active', productId]
    );
    
    // Update image if provided
    if (imageUrl) {
      // Check if product already has images
      const images = await connection.execute('SELECT * FROM ProductImages WHERE prodID = ?', [productId]);
      
      if (images[0].length > 0) {
        // Update existing primary image
        await connection.execute(
          'UPDATE ProductImages SET imgURL = ?, imgAlt = ? WHERE prodID = ? AND imgID = ?',
          [imageUrl, imageAlt || prodTitle, productId, images[0][0].imgID]
        );
      } else {
        // Insert new image
        await connection.execute(
          'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
          [imageUrl, imageAlt || prodTitle, productId]
        );
      }
    }
    
    // Update categories - delete existing and insert new
    await connection.execute('DELETE FROM ProductCategories WHERE prodID = ?', [productId]);
    
    if (categories && categories.length > 0) {
      for (const catID of categories) {
        await connection.execute(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, catID]
        );
      }
    }
    
    // Update attributes - delete existing and insert new
    await connection.execute('DELETE FROM ProductAttributes WHERE prodID = ?', [productId]);
    
    if (attributes && Object.keys(attributes).length > 0) {
      for (const [attID, value] of Object.entries(attributes)) {
        if (value) {
          await connection.execute(
            'INSERT INTO ProductAttributes (prodID, attID, value) VALUES (?, ?, ?)',
            [productId, attID, value]
          );
        }
      }
    }
    
    // Commit transaction
    await connection.commit();
    
    res.json({
      message: 'Product updated successfully',
      productId: productId
    });
  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Update product status only
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const productId = req.params.id;
    
    // Check if product exists
    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Update only the status
    await query(
      'UPDATE Product SET prodStat = ? WHERE prodID = ?',
      [status, productId]
    );
    
    res.json({ message: 'Product status updated successfully' });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete a product
router.delete('/:id', authMiddleware, async (req, res) => {
  let connection;
  try {
    const productId = req.params.id;
    
    // Check if product exists
    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get a connection for transaction
    connection = await require('../config/db').getConnection();
    await connection.beginTransaction();
    
    // Delete related data first
    await connection.execute('DELETE FROM ProductCategories WHERE prodID = ?', [productId]);
    await connection.execute('DELETE FROM ProductAttributes WHERE prodID = ?', [productId]);
    
    // Delete image records
    await connection.execute('DELETE FROM ProductImages WHERE prodID = ?', [productId]);
    
    // Delete product
    await connection.execute('DELETE FROM Product WHERE prodID = ?', [productId]);
    
    // Commit transaction
    await connection.commit();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    // Rollback on error
    if (connection) {
      await connection.rollback();
    }
    
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;