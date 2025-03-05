// routes/products.js - Example API route file
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await query('SELECT * FROM Product');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const product = await query('SELECT * FROM Product WHERE prodID = ?', [req.params.id]);
    if (product.length === 0) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;