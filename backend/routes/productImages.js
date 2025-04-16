const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { authMiddleware } = require('./authentication');
const pool = require('../config/db');

router.get('/products/:id/images', async (req, res) => {
  try {
    const queryResult = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.prodID = ?`,
      [req.params.id]
    );
    
    const rows = queryResult[0];

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
  
  // More detailed logging of the input parameters
  console.log('Image creation parameters:', {
    imgURL,
    imgAlt: imgAlt || 'null',
    imgWidth: imgWidth || 'null',
    imgHeight: imgHeight || 'null',
    prodID,
    varID: varID || 'null'
  });
 
  try {
    if (varID) {
      try {
        const variantCheckResult = await pool.query(
          'SELECT varID FROM ProductVariants WHERE varID = ?', 
          [varID]
        );
        const variantCheck = variantCheckResult[0];
        
        if (!variantCheck || variantCheck.length === 0) {
          console.warn(`Warning: Variant ID ${varID} does not exist in the database`);
        } else {
          console.log(`Verified that variant ID ${varID} exists in the database`);
        }
      } catch (variantError) {
        console.error('Error checking variant:', variantError);
      }
    }
    
    const imgAltValue = imgAlt || null;
    const imgWidthValue = imgWidth || null;
    const imgHeightValue = imgHeight || null;
    const varIDValue = varID || null;
    
    console.log('About to execute INSERT query with values:', [
      imgURL, imgAltValue, imgWidthValue, imgHeightValue, prodID, varIDValue
    ]);
   
    const insertResult = await pool.query(
      `INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID, varID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imgURL, imgAltValue, imgWidthValue, imgHeightValue, prodID, varIDValue]
    );    
    
    const newImageId = insertResult[0].insertId;
    console.log(`Created new image with ID ${newImageId}, varID: ${varIDValue || 'NULL'}`);
    
    // Fetching the newly inserted image
    console.log('Fetching newly created image with ID:', newImageId);
    
    const newImageResult = await pool.query(
      `SELECT pi.*, pv.varSKU
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.imgID = ?`,
      [newImageId]
    );
    
    console.log('New image query result:', JSON.stringify(newImageResult));
    const newImage = newImageResult[0];
    console.log('Extracted new image array:', newImage);
   
    if (newImage && newImage.length > 0) {
      console.log('Returning image data:', newImage[0]);
      res.status(201).json(newImage[0]);
    } else {
      console.log('Image created but details could not be retrieved');
      res.status(201).json({ 
        imgID: newImageId, 
        message: 'Image created but details could not be retrieved' 
      });
    }
  } catch (error) {
    console.error('Detailed error adding product image:', error);
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      res.status(400).json({ 
        message: 'Error adding product image', 
        error: 'The variant or product ID does not exist'
      });
    } else if (error.code === 'ER_BAD_NULL_ERROR') {
      res.status(400).json({ 
        message: 'Error adding product image', 
        error: 'A required field cannot be NULL'
      });
    } else {
      res.status(500).json({ 
        message: 'Error adding product image', 
        error: error.message,
        details: 'Check server logs for more information'
      });
    }
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
      try {
        const variantCheckResult = await pool.query(
          'SELECT varID FROM ProductVariants WHERE varID = ?', 
          [processedVarID]
        );
        const variantCheck = variantCheckResult[0];
        
        if (variantCheck.length === 0) {
          console.warn(`Warning: Variant ID ${processedVarID} does not exist in the database`);
        }
      } catch (variantError) {
        console.error('Error checking variant:', variantError);

      }
    }
 
    const updateResult = await pool.query(
      `UPDATE ProductImages 
       SET imgURL = ?, imgAlt = ?, imgWidth = ?, imgHeight = ?, varID = ? 
       WHERE imgID = ?`,
      [imgURL, imgAlt, imgWidth || null, imgHeight || null, processedVarID, imgID]
    );
 
    const updateResultData = updateResult[0];
    
    console.log(`Updated image ID ${imgID}, set varID to: ${processedVarID}`);
    

    const updatedImageResult = await pool.query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.imgID = ?`,
      [imgID]
    );
 
    const updatedImage = updatedImageResult[0];
    
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

    const [deleteResult] = await pool.query('DELETE FROM ProductImages WHERE imgID = ?', [imgID]);
    const result = deleteResult.affectedRows;
    
    console.log('Delete result:', result);
    
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ message: 'Error deleting product image', error: error.message });
  }
});

module.exports = router;