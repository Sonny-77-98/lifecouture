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


// Get all users
router.get('/', authMiddleware, async (req, res) => {
  try {
    console.log('Users GET route handler called!');
    
    const users = await query(`
      SELECT usID, usFname, usLname, usEmail, usPNum, usRole
      FROM User
      ORDER BY usFname, usLname
    `);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userResult = await query(`
      SELECT usID, usFname, usLname, usEmail, usPNum, usRole, usDesc
      FROM User
      WHERE usID = ?
    `, [req.params.id]);
    
    if (userResult.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(userResult[0]);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: error.message });
  }
});


router.post('/', authMiddleware, async (req, res) => {
  try {
    const { 
      firstName, lastName, email, phoneNumber, 
      password, role, description, address 
    } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber || !password) {
      return res.status(400).json({ 
        message: 'First name, last name, email, phone number and password are required' 
      });
    }
    const existingUser = await query('SELECT usID FROM User WHERE usEmail = ?', [email]);
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const addressResult = await query(
      `INSERT INTO UserAddresses 
        (usAdType, usAdStr, usAdCity, usAdState, usAdPCode, usAdCountry, usAdIsDefault) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        address.type || 'shipping',
        address.street,
        address.city,
        address.state,
        address.postalCode,
        address.country || 'USA',
        true
      ]
    );
    
    const addressId = addressResult.insertId;

    const userResult = await query(
      `INSERT INTO User 
        (usFname, usLname, usDesc, usPassword, usRole, usPNum, usEmail, usAdID) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        description || '',
        password,
        role || 'customer',
        phoneNumber,
        email,
        addressId
      ]
    );
    
    res.status(201).json({
      message: 'User created successfully',
      userId: userResult.insertId
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { 
      firstName, lastName, email, phoneNumber, 
      role, description
    } = req.body;

    const existingUser = await query('SELECT usID FROM User WHERE usID = ?', [req.params.id]);
    
    if (existingUser.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    await query(
      `UPDATE User 
       SET usFname = ?, usLname = ?, usDesc = ?, 
           usRole = ?, usPNum = ?, usEmail = ?
       WHERE usID = ?`,
      [
        firstName,
        lastName,
        description || '',
        role || 'customer',
        phoneNumber,
        email,
        req.params.id
      ]
    );
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:userId/addresses',authMiddleware , async (req, res) => {
  try {
    console.log(`Getting address for user ID: ${req.params.userId}`);
    const user = await query('SELECT usAdID FROM User WHERE usID = ?', [req.params.userId]);
    
    console.log(`User query result:`, user);
    
    if (!user.length) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }
    
    const addressId = user[0].usAdID;
    console.log(`Looking for address with ID: ${addressId}`);
    
    const address = await query('SELECT * FROM UserAddresses WHERE usAdID = ?', [addressId]);
    
    console.log(`Address query result:`, address);
    
    if (!address.length) {
      console.log('Address not found');
      return res.status(404).json({ message: 'Address not found' });
    }
    
    console.log(`Returning address:`, address);
    res.json(address);
  } catch (error) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ error: error.message });
  }
});

  router.post('/:id/addresses', authMiddleware, async (req, res) => {
    try {
      const {
        type, street, city, state, postalCode, country, isDefault
      } = req.body;
      
      const existingUser = await query('SELECT usID FROM User WHERE usID = ?', [req.params.id]);
      
      if (existingUser.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const addressResult = await query(
        `INSERT INTO UserAddresses 
          (usAdType, usAdStr, usAdCity, usAdState, usAdPCode, usAdCountry, usAdIsDefault, usID) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          type || 'shipping',
          street,
          city,
          state,
          postalCode,
          country || 'USA',
          isDefault || false,
        ]
      );
      
      const addressId = addressResult.insertId;
      
      if (isDefault) {
        await query('UPDATE User SET usAdID = ? WHERE usID = ?', [addressId, req.params.id]);
      }
      
      res.status(201).json({
        message: 'Address added successfully',
        addressId
      });
    } catch (error) {
      console.error('Error adding address:', error);
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;