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

  router.get('/:userId/addresses', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`Getting addresses for user ID: ${userId}`);

    const userExists = await query('SELECT usID FROM User WHERE usID = ?', [userId]);
    if (userExists.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const addresses = await query('SELECT * FROM UserAddresses WHERE usID = ?', [userId]);
    console.log(`Found ${addresses.length} addresses for user ${userId}`);
 
    const userDefaultAddress = await query('SELECT usAdID FROM User WHERE usID = ?', [userId]);
    
    if (addresses.length > 0 && userDefaultAddress[0] && userDefaultAddress[0].usAdID) {
      addresses.forEach(addr => {
        if (addr.usAdID === userDefaultAddress[0].usAdID) {
          addr.usAdIsDefault = true;
        }
      });
    }

    return res.json(addresses);
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/:id/addresses', authMiddleware, async (req, res) => {
  try {
    const {
      type, street, city, state, postalCode, country, isDefault
    } = req.body;

    const userId = req.params.id;  
    
    const existingUser = await query('SELECT usID FROM User WHERE usID = ?', [userId]);
    
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
        userId
      ]
    );
    
    const addressId = addressResult.insertId;
    
    if (isDefault) {
      await query('UPDATE User SET usAdID = ? WHERE usID = ?', [addressId, userId]);
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

router.delete('/:userId/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const addressCheck = await query(
      'SELECT usAdID FROM UserAddresses WHERE usAdID = ? AND usID = ?', 
      [addressId, userId]
    );
    
    if (addressCheck.length === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to this user' });
    }
    const userCheck = await query('SELECT usAdID FROM User WHERE usID = ?', [userId]);
    
    if (userCheck[0].usAdID == addressId) {
      const otherAddresses = await query(
        'SELECT usAdID FROM UserAddresses WHERE usID = ? AND usAdID != ? LIMIT 1',
        [userId, addressId]
      );
      
      if (otherAddresses.length > 0) {
        await query('UPDATE User SET usAdID = ? WHERE usID = ?', [otherAddresses[0].usAdID, userId]);
      } else {
        await query('UPDATE User SET usAdID = NULL WHERE usID = ?', [userId]);
      }
    }
    
    await query('DELETE FROM UserAddresses WHERE usAdID = ?', [addressId]);
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:userId/addresses/:addressId/default', authMiddleware, async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const addressCheck = await query(
      'SELECT usAdID FROM UserAddresses WHERE usAdID = ? AND usID = ?', 
      [addressId, userId]
    );
    
    if (addressCheck.length === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to this user' });
    }

    await query('UPDATE User SET usAdID = ? WHERE usID = ?', [addressId, userId]);
    
    res.json({ message: 'Default address updated successfully' });
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:userId/addresses/:addressId', authMiddleware, async (req, res) => {
  try {
    const { userId, addressId } = req.params;

    const addressCheck = await query(
      'SELECT usAdID FROM UserAddresses WHERE usAdID = ? AND usID = ?', 
      [addressId, userId]
    );
    
    if (addressCheck.length === 0) {
      return res.status(404).json({ message: 'Address not found or does not belong to this user' });
    }

    const userCheck = await query('SELECT usAdID FROM User WHERE usID = ?', [userId]);
    
    if (userCheck[0].usAdID == addressId) {
      const otherAddresses = await query(
        'SELECT usAdID FROM UserAddresses WHERE usID = ? AND usAdID != ? LIMIT 1',
        [userId, addressId]
      );
      
      if (otherAddresses.length > 0) {
        await query('UPDATE User SET usAdID = ? WHERE usID = ?', [otherAddresses[0].usAdID, userId]);
      } else {
        await query('UPDATE User SET usAdID = NULL WHERE usID = ?', [userId]);
      }
    }

    await query('DELETE FROM UserAddresses WHERE usAdID = ?', [addressId]);
    
    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({ error: error.message });
  }
});
module.exports = router;