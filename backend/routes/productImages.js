const express = require('express');
const router = express.Router();
const { query, pool } = require('../config/db');
const { authMiddleware } = require('./authentication');

router.get('/products/:id/images', async (req, res) => {
  try {
    const images = await query(
      `SELECT pi.*, pv.varSKU 
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.prodID = ?`,
      [req.params.id]
    );
    
    console.log(`Retrieved ${images.length} images for product ${req.params.id}`);
    res.json(images);
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
        const variantCheck = await query(
          'SELECT varID FROM ProductVariants WHERE varID = ?', 
          [varID]
        );
        
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
   
    const insertResult = await query(
      `INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID, varID)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [imgURL, imgAltValue, imgWidthValue, imgHeightValue, prodID, varIDValue]
    );    
    
    const newImageId = insertResult.insertId;
    console.log(`Created new image with ID ${newImageId}, varID: ${varIDValue || 'NULL'}`);
    
    // Fetching the newly inserted image
    console.log('Fetching newly created image with ID:', newImageId);
    
    const newImage = await query(
      `SELECT pi.*, pv.varSKU
       FROM ProductImages pi
       LEFT JOIN ProductVariants pv ON pi.varID = pv.varID
       WHERE pi.imgID = ?`,
      [newImageId]
    );
    
    console.log('New image query result:', JSON.stringify(newImage));
   
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
        const variantCheck = await query(
          'SELECT varID FROM ProductVariants WHERE varID = ?', 
          [processedVarID]
        );
        
        if (variantCheck.length === 0) {
          console.warn(`Warning: Variant ID ${processedVarID} does not exist in the database`);
        }
      } catch (variantError) {
        console.error('Error checking variant:', variantError);
      }
    }
 
    await query(
      `UPDATE ProductImages 
       SET imgURL = ?, imgAlt = ?, imgWidth = ?, imgHeight = ?, varID = ? 
       WHERE imgID = ?`,
      [imgURL, imgAlt, imgWidth || null, imgHeight || null, processedVarID, imgID]
    );
    
    console.log(`Updated image ID ${imgID}, set varID to: ${processedVarID}`);
    
    const updatedImage = await query(
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

// Fix for the DELETE route - The main issue is here
router.delete('/products/images/:id', authMiddleware, async (req, res) => {
  const imgID = req.params.id;

  if (!imgID || isNaN(parseInt(imgID))) {
    return res.status(400).json({ message: 'Invalid image ID' });
  }
  
  try {
    console.log(`Attempting to delete image with ID: ${imgID}`);

    // Use the query function properly, avoiding returning the result directly
    const result = await query('DELETE FROM ProductImages WHERE imgID = ?', [imgID]);
    
    console.log('Delete result:', result);
    
    if (result.affectedRows > 0) {
      res.json({ message: 'Image deleted successfully', success: true });
    } else {
      res.status(404).json({ message: 'Image not found', success: false });
    }
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ 
      message: 'Error deleting product image', 
      error: error.message,
      success: false 
    });
  }
});

module.exports = router;