const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env.admin'});

// Authentication middleware - verify token
const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query('SELECT * FROM admin_users WHERE id = ? AND role = ?', [decoded.id, 'admin']);
    
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

// PUBLIC ROUTES

router.get('/', async (req, res) => {
  try {
    let sql = `
      SELECT p.prodID, p.prodTitle, p.prodDesc, p.prodURL, p.prodStat, 
             GROUP_CONCAT(DISTINCT c.catName) as categoryNames,
             GROUP_CONCAT(DISTINCT pc.catID) as categoryIds
      FROM Product p
      LEFT JOIN ProductCategories pc ON p.prodID = pc.prodID
      LEFT JOIN Categories c ON pc.catID = c.catID
    `;
    
    const params = [];
    const whereConditions = [];
    
    if (req.query.category) {
      whereConditions.push(`
        p.prodID IN (
          SELECT prodID FROM ProductCategories 
          WHERE catID = ?
        )
      `);
      params.push(req.query.category);
    }
    
    if (req.query.status) {
      whereConditions.push('p.prodStat = ?');
      params.push(req.query.status);
    }
    
    if (whereConditions.length > 0) {
      sql += ' WHERE ' + whereConditions.join(' AND ');
    }

    sql += ' GROUP BY p.prodID, p.prodTitle, p.prodDesc, p.prodURL, p.prodStat';
 
    sql += ' ORDER BY p.prodID DESC';
    
    const products = await query(sql, params);

    const transformedProducts = await Promise.all(products.map(async (product) => {
      const images = await query('SELECT * FROM ProductImages WHERE prodID = ? LIMIT 1', [product.prodID]);
  
      if (product.categoryIds) {
        product.categories = product.categoryIds.split(',').map(id => parseInt(id));
        product.categoryList = product.categoryNames ? product.categoryNames.split(',') : [];
      } else {
        product.categories = [];
        product.categoryList = [];
      }
      
      if (images.length > 0) {
        product.imageUrl = images[0].imgURL;
        product.imageAlt = images[0].imgAlt;
      }

      delete product.categoryIds;
      delete product.categoryNames;
      
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

router.post('/', authMiddleware, async (req, res) => {
  let connection;
  try {
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
    
    if (!prodTitle || !prodDesc) {
      return res.status(400).json({ message: 'Product title and description are required' });
    }
    const { pool } = require('../config/db');
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [productResult] = await connection.execute(
      'INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) VALUES (?, ?, ?, ?)',
        [prodTitle, prodDesc, prodURL, prodStat]
    );
    
    const productId = productResult.insertId;

    if (imageUrl) {
      await connection.execute(
        'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
        [imageUrl, imageAlt || prodTitle, productId]
      );
    }

    if (categories && categories.length > 0) {
      for (const catID of categories) {
        await connection.execute(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, catID]
        );
      }
    }

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

    await connection.commit();
    
    res.status(201).json({
      message: 'Product created successfully',
      productId: productId
    });
  } catch (error) {
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

router.put('/:id', authMiddleware, async (req, res) => {
  let connection;
  try {
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

    if (!prodTitle || !prodDesc) {
      return res.status(400).json({ message: 'Product title and description are required' });
    }

    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }

    connection = await require('../config/db').getConnection();
    await connection.beginTransaction();

    await connection.execute(
      'UPDATE Product SET prodTitle = ?, prodDesc = ?, prodURL = ?, prodStat = ? WHERE prodID = ?',
      [prodTitle, prodDesc, prodURL || prodTitle.toLowerCase().replace(/\s+/g, '-'), prodStat || 'active', productId]
    );

    if (imageUrl) {
      const images = await connection.execute('SELECT * FROM ProductImages WHERE prodID = ?', [productId]);
      
      if (images[0].length > 0) {

        await connection.execute(
          'UPDATE ProductImages SET imgURL = ? WHERE prodID = ? AND imgID = ?',
          [imageUrl, productId, images[0][0].imgID]
        );
      } else {
        await connection.execute(
          'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
          [imageUrl, imageAlt || prodTitle, productId]
        );
      }
    }

    await connection.execute('DELETE FROM ProductCategories WHERE prodID = ?', [productId]);
    
    if (categories && categories.length > 0) {
      for (const catID of categories) {
        await connection.execute(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, catID]
        );
      }
    }

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
    
    await connection.commit();
    
    res.json({
      message: 'Product updated successfully',
      productId: productId
    });
  } catch (error) {
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

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const productId = req.params.id;

    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
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

router.delete('/:id', authMiddleware, async (req, res) => {
  let connection;
  try {
    const productId = req.params.id;

    const product = await query('SELECT * FROM Product WHERE prodID = ?', [productId]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
 
    connection = await require('../config/db').getConnection();
    await connection.beginTransaction();

    await connection.execute('DELETE FROM ProductCategories WHERE prodID = ?', [productId]);
    await connection.execute('DELETE FROM ProductAttributes WHERE prodID = ?', [productId]);

    await connection.execute('DELETE FROM ProductImages WHERE prodID = ?', [productId]);

    await connection.execute('DELETE FROM Product WHERE prodID = ?', [productId]);

    await connection.commit();
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
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