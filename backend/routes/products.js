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
      SELECT pav.*, pa.attName 
      FROM VariantAttributesValues pav
      JOIN ProductAttributes pa ON pav.attID = pa.attID
      JOIN ProductVariants pv ON pav.varID = pv.varID
      WHERE pv.prodID = ?
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

router.get('/:id/variants', async (req, res) => {
  try {
    const variants = await query(`
      SELECT pv.*, i.invQty, pv.varPrice
      FROM ProductVariants pv
      LEFT JOIN Inventory i ON pv.varID = i.varID
      WHERE pv.prodID = ?
    `, [req.params.id]);
    
    res.json(variants);
  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ROUTES - Protected by authentication middleware

router.post('/', authMiddleware, async (req, res) => {
  let connection;
  try {
    let categories = req.body.categories;
    let attributes = req.body.attributes;
    let variants = req.body.variants || [];
    let images = req.body.images || [];
    
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
    
    const { prodTitle, prodDesc, prodURL, prodStat } = req.body;
    
    if (!prodTitle || !prodDesc) {
      return res.status(400).json({ message: 'Product title and description are required' });
    }
    
    const { pool } = require('../config/db');
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Insert the product
    const [productResult] = await connection.execute(
      'INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) VALUES (?, ?, ?, ?)',
        [prodTitle, prodDesc, prodURL, prodStat]
    );
    
    const productId = productResult.insertId;

    // Insert main product image if provided
    if (prodURL) {
      await connection.execute(
        'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
        [prodURL, prodTitle, productId]
      );
    }

    // Insert additional product images if provided
    if (images && images.length > 0) {
      for (const image of images) {
        if (image.imgURL) {
          await connection.execute(
            'INSERT INTO ProductImages (imgURL, imgAlt, prodID) VALUES (?, ?, ?)',
            [image.imgURL, image.imgAlt || prodTitle, productId]
          );
        }
      }
    }

    // Insert product categories
    if (categories && categories.length > 0) {
      for (const catID of categories) {
        await connection.execute(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, catID]
        );
      }
    }

    // Insert product attributes
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
    
    // Process variants
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        // Insert the variant
        const [variantResult] = await connection.execute(
          'INSERT INTO ProductVariants (varSKU, varBCode, prodID, varPrice) VALUES (?, ?, ?, ?)',
          [variant.varSKU, variant.varBCode || null, productId, parseFloat(variant.varPrice) || 83.54]
        );
        
        const variantId = variantResult.insertId;
        
        if (variant.attributes && variant.attributes.length > 0) {
          for (const attr of variant.attributes) {
            if (attr.attValue) {
              await connection.execute(
                'INSERT INTO VariantAttributesValues (varID, attID, attValue) VALUES (?, ?, ?)',
                [variantId, attr.attID, attr.attValue]
              );
            }
          }
        }
        
        // Create inventory record for the variant
        const quantity = parseInt(variant.quantity) || 0;
        await connection.execute(
          'INSERT INTO Inventory (invQty, InvLowStockThreshold, varID) VALUES (?, ?, ?)',
          [quantity, 5, variantId]
        );
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
   
    if (typeof categories === 'string') {
      try {
        categories = JSON.parse(categories);
      } catch (e) {
        categories = [];
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
    const { pool } = require('../config/db');
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const variantsToDelete = req.body.variantsToDelete || [];
    if (variantsToDelete.length > 0) {
      for (const variantId of variantsToDelete) {
        await connection.execute(
          'DELETE FROM Inventory WHERE varID = ?',
          [variantId]
        );

        await connection.execute(
          'DELETE FROM VariantAttributesValues WHERE varID = ?',
          [variantId]
        );

        await connection.execute(
          'DELETE FROM ProductVariants WHERE varID = ?',
          [variantId]
        );
      }
    }
    
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
    const variants = req.body.variants || [];
    if (variants && variants.length > 0) {
      for (const variant of variants) {
        if (variant.varID) {
          await connection.execute(
            'UPDATE ProductVariants SET varSKU = ?, varBCode = ?, varPrice = ? WHERE varID = ?',
            [variant.varSKU, variant.varBCode || null, parseFloat(variant.varPrice) || 83.54, variant.varID]
          );
          if (variant.quantity !== undefined) {
            await connection.execute(
              'UPDATE Inventory SET invQty = ? WHERE varID = ?',
              [parseInt(variant.quantity) || 0, variant.varID]
            );
          }
        } else {
          const [variantResult] = await connection.execute(
            'INSERT INTO ProductVariants (varSKU, varBCode, prodID, varPrice) VALUES (?, ?, ?, ?)',
            [variant.varSKU, variant.varBCode || null, productId, parseFloat(variant.varPrice) || 83.54]
          );
         
          const variantId = variantResult.insertId;
          const quantity = parseInt(variant.quantity) || 0;
          await connection.execute(
            'INSERT INTO Inventory (invQty, InvLowStockThreshold, varID) VALUES (?, ?, ?)',
            [quantity, 5, variantId]
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
    
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const product = await query('SELECT * FROM Product WHERE prodID = ?', [req.params.id]);
    
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    await query(
      'UPDATE Product SET prodStat = ? WHERE prodID = ?',
      [status, req.params.id]
    );
    
    res.json({ 
      message: 'Product status updated successfully',
      status: status 
    });
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

    connection = await require('../config/db').pool.getConnection();
    
    try {
      await connection.execute('CALL PurgeProduct(?)', [productId]);
      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      if (error.message && error.message.includes('Cannot delete product with existing orders')) {
        return res.status(400).json({ 
          message: 'Cannot delete product with existing orders. Consider marking it as inactive instead.'
        });
      }
      throw error;
    }
    
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ 
      message: 'Server error while deleting product', 
      error: error.message 
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;