const express = require('express');
const router = express.Router();
const { authMiddleware } = require('./authentication');
const pool = require('../config/db');

router.get('/products', async (req, res) => {
  try {
    let query = `
      SELECT p.*, 
        GROUP_CONCAT(DISTINCT c.catID) as categoryIds,
        GROUP_CONCAT(DISTINCT c.catName) as categoryNames
      FROM Product p
      LEFT JOIN ProductCategories pc ON p.prodID = pc.prodID
      LEFT JOIN Categories c ON pc.catID = c.catID
    `;
    
    const queryParams = [];

    if (req.query.category) {
      query += ` 
        WHERE p.prodID IN (
          SELECT DISTINCT pc.prodID 
          FROM ProductCategories pc 
          WHERE pc.catID = ?
        )
      `;
      queryParams.push(req.query.category);
    }
 
    if (req.query.status) {
      query += queryParams.length ? ' AND ' : ' WHERE ';
      query += 'p.prodStat = ?';
      queryParams.push(req.query.status);
    }
    
    query += ' GROUP BY p.prodID';
    
    const [rows] = await pool.query(query, queryParams);

    const productsWithCategories = rows.map(product => {
      const categoryIds = product.categoryIds ? product.categoryIds.split(',').map(id => parseInt(id)) : [];
      const categoryNames = product.categoryNames ? product.categoryNames.split(',') : [];
      
      const categories = categoryIds.map((id, index) => ({
        catID: id,
        catName: categoryNames[index] || ''
      }));

      delete product.categoryIds;
      delete product.categoryNames;
      
      return {
        ...product,
        categories
      };
    });
    
    res.json(productsWithCategories);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products' });
  }
});

router.get('/products/:id', async (req, res) => {
  try {
    const [productRows] = await pool.query(
      `SELECT p.*, 
        GROUP_CONCAT(DISTINCT c.catID) as categoryIds,
        GROUP_CONCAT(DISTINCT c.catName) as categoryNames
      FROM Product p
      LEFT JOIN ProductCategories pc ON p.prodID = pc.prodID
      LEFT JOIN Categories c ON pc.catID = c.catID
      WHERE p.prodID = ?
      GROUP BY p.prodID`,
      [req.params.id]
    );
    
    if (productRows.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    const product = productRows[0];

    const categoryIds = product.categoryIds ? product.categoryIds.split(',').map(id => parseInt(id)) : [];
    const categoryNames = product.categoryNames ? product.categoryNames.split(',') : [];
    
    const categories = categoryIds.map((id, index) => ({
      catID: id,
      catName: categoryNames[index] || ''
    }));
    
    delete product.categoryIds;
    delete product.categoryNames;

    const [imagesRows] = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.prodID = ?`,
      [req.params.id]
    );

    res.json({
      ...product,
      categories,
      images: imagesRows
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product' });
  }
});

router.post('/products', authMiddleware, async (req, res) => {
  const { prodTitle, prodDesc, prodStat, prodURL, categories, images } = req.body;

  if (!prodTitle || !prodDesc) {
    return res.status(400).json({ message: 'Product title and description are required' });
  }
  
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [productResult] = await connection.query(
      'INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) VALUES (?, ?, ?, ?)',
      [prodTitle, prodDesc, prodURL, prodStat || 'active']
    );
    
    const prodID = productResult.insertId;

    if (categories && categories.length > 0) {
      const categoryValues = categories.map(catID => [prodID, catID]);
      
      await connection.query(
        'INSERT INTO ProductCategories (prodID, catID) VALUES ?',
        [categoryValues]
      );
    }

    if (images && images.length > 0) {
      for (const image of images) {
        await connection.query(
          `INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID, varID) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            image.imgURL, 
            image.imgAlt || prodTitle, 
            image.imgWidth || null, 
            image.imgHeight || null, 
            prodID, 
            image.varID || null
          ]
        );
      }
    }
    
    await connection.commit();

    const [productRows] = await connection.query(
      `SELECT * FROM Product WHERE prodID = ?`,
      [prodID]
    );
    
    res.status(201).json({
      ...productRows[0],
      message: 'Product created successfully'
    });
  } catch (error) {
    if (connection) await connection.rollback();
    
    console.error('Error creating product:', error);
    res.status(500).json({ message: 'Error creating product' });
  } finally {
    if (connection) connection.release();
  }
});

router.put('/products/:id', authMiddleware , async (req, res) => {
  const prodID = req.params.id;
  const { prodTitle, prodDesc, prodStat, prodURL, categories, images } = req.body;

  if (!prodTitle || !prodDesc) {
    return res.status(400).json({ message: 'Product title and description are required' });
  }
  
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [checkResult] = await connection.query(
      'SELECT * FROM Product WHERE prodID = ?',
      [prodID]
    );
    
    if (checkResult.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }
    await connection.query(
      'UPDATE Product SET prodTitle = ?, prodDesc = ?, prodURL = ?, prodStat = ? WHERE prodID = ?',
      [prodTitle, prodDesc, prodURL, prodStat, prodID]
    );

    if (categories) {
      await connection.query(
        'DELETE FROM ProductCategories WHERE prodID = ?',
        [prodID]
      );
      if (categories.length > 0) {
        const categoryValues = categories.map(catID => [prodID, catID]);
        
        await connection.query(
          'INSERT INTO ProductCategories (prodID, catID) VALUES ?',
          [categoryValues]
        );
      }
    }

    if (images) {
      for (const image of images) {
        if (image.imgID) {
          await connection.query(
            `UPDATE ProductImages 
             SET imgURL = ?, imgAlt = ?, imgWidth = ?, imgHeight = ?, varID = ? 
             WHERE imgID = ? AND prodID = ?`,
            [
              image.imgURL, 
              image.imgAlt || prodTitle, 
              image.imgWidth || null, 
              image.imgHeight || null, 
              image.varID || null,
              image.imgID,
              prodID
            ]
          );
        } else {
          await connection.query(
            `INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID, varID) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              image.imgURL, 
              image.imgAlt || prodTitle, 
              image.imgWidth || null, 
              image.imgHeight || null, 
              prodID, 
              image.varID || null
            ]
          );
        }
      }

      const currentImageIds = images
        .filter(img => img.imgID)
        .map(img => img.imgID);
      if (currentImageIds.length > 0) {
        await connection.query(
          `DELETE FROM ProductImages 
           WHERE prodID = ? AND imgID NOT IN (?)`,
          [prodID, currentImageIds]
        );
      } else if (images.length === 0) {
        await connection.query(
          'DELETE FROM ProductImages WHERE prodID = ?',
          [prodID]
        );
      }
    }
    
    await connection.commit();
    
    res.json({ 
      prodID,
      message: 'Product updated successfully' 
    });
  } catch (error) {
    if (connection) await connection.rollback();
    
    console.error('Error updating product:', error);
    res.status(500).json({ message: 'Error updating product' });
  } finally {
    if (connection) connection.release();
  }
});

router.delete('/products/:id', authMiddleware, async (req, res) => {
  const prodID = req.params.id;
  
  let connection;
  
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    await connection.query(
      'DELETE FROM ProductImages WHERE prodID = ?',
      [prodID]
    );

    await connection.query(
      'DELETE FROM ProductCategories WHERE prodID = ?',
      [prodID]
    );
    
    await connection.query(
      'DELETE FROM ProductVariants WHERE prodID = ?',
      [prodID]
    );
    const [result] = await connection.query(
      'DELETE FROM Product WHERE prodID = ?',
      [prodID]
    );
    
    await connection.commit();
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    if (connection) await connection.rollback();
    
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product' });
  } finally {
    if (connection) connection.release();
  }
});

router.get('/products/:id/variants', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pv.*, vav.attValue, pa.attName
       FROM ProductVariants pv
       LEFT JOIN VariantAttributesValues vav ON pv.varID = vav.varID
       LEFT JOIN ProductAttributes pa ON vav.attID = pa.attID
       WHERE pv.prodID = ?`,
      [req.params.id]
    );
    const variantsMap = new Map();
    
    rows.forEach(row => {
      const { varID, prodID, varSKU, varBCode, varPrice, attName, attValue } = row;
      
      if (!variantsMap.has(varID)) {
        variantsMap.set(varID, {
          varID,
          prodID,
          varSKU,
          varBCode,
          varPrice,
          attributes: {}
        });
      }
      
      if (attName && attValue) {
        variantsMap.get(varID).attributes[attName] = attValue;
      }
    });
    
    const variants = Array.from(variantsMap.values());
    res.json(variants);
  } catch (error) {
    console.error('Error fetching product variants:', error);
    res.status(500).json({ message: 'Error fetching product variants' });
  }
});

module.exports = router;