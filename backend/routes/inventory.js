 // inventory.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { authMiddleware } = require('./authentication');

// Get all inventory items with product details
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sql = `
      SELECT i.invID, i.invQty, i.InvLowStockThreshold, 
             pv.varID, pv.varSKU, pv.varBCode,
             p.prodID, p.prodTitle, p.prodStat,
             (i.invQty <= i.InvLowStockThreshold) as isLowStock
      FROM Inventory i
      JOIN ProductVariants pv ON i.varID = pv.varID
      JOIN Product p ON pv.prodID = p.prodID
      ORDER BY isLowStock DESC, p.prodTitle ASC, pv.varSKU ASC
    `;
    
    const inventoryItems = await query(sql);
    res.json(inventoryItems);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get low stock items
router.get('/low-stock', authMiddleware, async (req, res) => {
  try {
    const results = await query('CALL RetrieveLowStockItems()');
    res.json(results[0]);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update inventory quantity
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { newQuantity } = req.body;
    
    if (newQuantity === undefined || newQuantity < 0) {
      return res.status(400).json({ message: 'Valid quantity is required' });
    }
    
    const results = await query(
      'CALL UpdateInventoryQuantity(?, ?)',
      [req.params.id, newQuantity]
    );
    
    res.json(results[0][0]);
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

// Adjust inventory (add or subtract)
router.patch('/:id/adjust', authMiddleware, async (req, res) => {
  try {
    const { adjustment } = req.body;
    
    if (adjustment === undefined) {
      return res.status(400).json({ message: 'Adjustment value is required' });
    }
    
    const results = await query(
      'CALL AdjustInventoryQuantity(?, ?)',
      [req.params.id, adjustment]
    );
    
    res.json(results[0][0]);
  } catch (error) {
    console.error('Error adjusting inventory:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;