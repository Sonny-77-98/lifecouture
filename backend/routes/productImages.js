const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { authMiddleware } = require('./authentication');
const pool = require('../config/db');

router.get('/products/:id/images', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.prodID = ?`,
      [req.params.id]
    );

    console.log(`Retrieved ${rows.length} images for product ${req.params.id}`);
    rows.forEach(row => {
      console.log(`Image ID: ${row.imgID}, VarID: ${row.varID || 'NULL'}, VarSKU: ${row.varSKU || 'NULL'}`);
    });
    
    res.json(rows);
  } catch (error) {
    console.error('Error fetching product images:', error);
    res.status(500).json({ message: 'Error fetching product images' });
  }
});

router.post('/products/:id/images', authMiddleware, async (req, res) => {
  const { imgURL, imgAlt, varID, imgWidth, imgHeight } = req.body;
  const prodID = req.params.id;
  
  if (!imgURL) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  console.log(`Processing POST - varID input: '${varID}', processed: '${varID}'`);
  
  try {
    if (varID) {
      const [variantCheck] = await pool.query(
        'SELECT varID FROM ProductVariants WHERE varID = ?', 
        [varID]
      );
      
      // Fix for the length error - make sure variantCheck is an array before checking length
      if (!variantCheck || variantCheck.length === 0) {
        console.warn(`Warning: Variant ID ${varID} does not exist in the database`);
      }
    }

    const [result] = await pool.query(
      `INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID, varID) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imgURL, imgAlt || null, imgWidth || null, imgHeight || null, prodID, varID || null]
    );
    
    const newImageId = result.insertId;
    console.log(`Created new image with ID ${newImageId}, varID: ${varID || 'NULL'}`);
 
    const [newImage] = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.imgID = ?`,
      [newImageId]
    );
    if (newImage && newImage.length > 0) {
      res.status(201).json(newImage[0]);
    } else {
      res.status(201).json({ imgID: newImageId, message: 'Image created but details could not be retrieved' });
    }
  } catch (error) {
    console.error('Error adding product image:', error);
    res.status(500).json({ message: 'Error adding product image', error: error.message });
  }
});

router.put('/products/images/:id', authMiddleware, async (req, res) => {
  const { imgURL, imgAlt, varID, imgWidth, imgHeight } = req.body;
  const imgID = req.params.id;
  
  if (!imgURL) {
    return res.status(400).json({ message: 'Image URL is required' });
  }

  const processedVarID = (varID === '' || varID === undefined) ? null : varID;
  console.log(`Processing PUT - varID input: '${varID}', processed: '${processedVarID}'`);
  
  try {
    if (processedVarID !== null) {
      const [variantCheck] = await pool.query(
        'SELECT varID FROM ProductVariants WHERE varID = ?', 
        [processedVarID]
      );
      
      if (variantCheck.length === 0) {
        console.warn(`Warning: Variant ID ${processedVarID} does not exist in the database`);
      }
    }
    
    const [updateResult] = await pool.query(
      `UPDATE ProductImages 
       SET imgURL = ?, imgAlt = ?, imgWidth = ?, imgHeight = ?, varID = ? 
       WHERE imgID = ?`,
      [imgURL, imgAlt, imgWidth || null, imgHeight || null, processedVarID, imgID]
    );
    
    console.log(`Updated image ID ${imgID}, set varID to: ${processedVarID}, affected rows: ${updateResult.affectedRows}`);
    
    if (updateResult.affectedRows === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    const [updatedImage] = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.imgID = ?`,
      [imgID]
    );
    
    if (updatedImage.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json(updatedImage[0]);
  } catch (error) {
    console.error('Error updating product image:', error);
    res.status(500).json({ message: 'Error updating product image', error: error.message });
  }
});

router.delete('/products/images/:id', authMiddleware, async (req, res) => {
  const imgID = req.params.id;

  if (!imgID || isNaN(parseInt(imgID))) {
    return res.status(400).json({ message: 'Invalid image ID' });
  }
  
  try {
    console.log(`Executing query: DELETE FROM ProductImages WHERE imgID = ${imgID}`);
    
    const [result] = await pool.query('DELETE FROM ProductImages WHERE imgID = ?', [imgID]);
    
    console.log('Delete result:', result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ message: 'Error deleting product image', error: error.message });
  }
});

module.exports = router;