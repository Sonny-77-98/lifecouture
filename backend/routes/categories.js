const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config({path: '.env.admin'});


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

// PUBLIC ROUTES

router.get('/', async (req, res) => {
  try {
    console.log('Categories GET route handler called!');
    console.log('Request query params:', req.query);
    
    let sql = 'SELECT * FROM Categories';
    
    if (req.query.includeAll === 'true') {
      console.log('Including all categories without filtering');
      const categories = await query(sql);
      return res.json(categories);
    }
    
    if (req.query.status) {
      sql += ' WHERE catStat = ?';
      console.log('Filtering by status:', req.query.status);
      const categories = await query(sql, [req.query.status]);
      return res.json(categories);
    } 

    else {
      console.log('No status filter, returning all categories');
      const categories = await query(sql);
      return res.json(categories);
    }
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const category = await query('SELECT * FROM Categories WHERE catID = ?', [req.params.id]);
    
    if (category.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    res.json(category[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/products', async (req, res) => {
  try {
    const sql = `
      SELECT p.* 
      FROM Product p
      JOIN ProductCategories pc ON p.prodID = pc.prodID
      WHERE pc.catID = ? AND p.prodStat = 'active'
    `;
    
    const products = await query(sql, [req.params.id]);
    res.json(products);
  } catch (error) {
    console.error('Error fetching category products:', error);
    res.status(500).json({ error: error.message });
  }
});

// ADMIN ROUTES - Protected by authentication middleware

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { catName, catDes, catStat, catSEO } = req.body;
    
    if (!catName) {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    const result = await query(
      'INSERT INTO Categories (catName, catDes, catStat, catSEO) VALUES (?, ?, ?, ?)',
      [catName, catDes || '', catStat || 'active', catSEO || '']
    );
    
    res.status(201).json({
      message: 'Category created successfully',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { catName, catDes, catStat, catSEO } = req.body;

    if (!catName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const existingCategory = await query('SELECT catID FROM Categories WHERE catID = ?', [req.params.id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    await query(
      'UPDATE Categories SET catName = ?, catDes = ?, catStat = ?, catSEO = ? WHERE catID = ?',
      [catName, catDes || '', catStat || 'active', catSEO || '', req.params.id]
    );
    
    res.json({ message: 'Category updated successfully' });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const existingCategory = await query('SELECT catID FROM Categories WHERE catID = ?', [req.params.id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await query(
      'UPDATE Categories SET catStat = ? WHERE catID = ?',
      [status, req.params.id]
    );
    
    res.json({ message: 'Category status updated successfully' });
  } catch (error) {
    console.error('Error updating category status:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const existingCategory = await query('SELECT catID FROM Categories WHERE catID = ?', [req.params.id]);
    if (existingCategory.length === 0) {
      return res.status(404).json({ message: 'Category not found' });
    }
    const inUseCheck = await query(
      'SELECT COUNT(*) as count FROM ProductCategories WHERE catID = ?', 
      [req.params.id]
    );
    
    if (inUseCheck[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete category as it is associated with products',
        count: inUseCheck[0].count
      });
    }
    
    await query('DELETE FROM Categories WHERE catID = ?', [req.params.id]);
    
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;