const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const path = require('path');
const dotenv = require('dotenv');


const envResult = dotenv.config({ path: '.env.admin' });

// Log environment loading result
if (envResult.error) {
  console.error('Error loading .env.admin file:', envResult.error);
} else {
  console.log('.env.admin file loaded successfully');
  console.log('Environment variables loaded:', Object.keys(process.env).join(', '));
}

const JWT_SECRET = process.env.JWT_SECRET || 'lifecouture_admin_default_secret';
console.log(`JWT_SECRET from env: ${process.env.JWT_SECRET ? 'Found' : 'Not found'}`);
console.log(`Using JWT_SECRET: ${(process.env.JWT_SECRET || 'default').substring(0, 3)}...`);

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
};


router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`Login attempt for username: ${username}`);
    
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute(
      'SELECT * FROM admin_users WHERE username = ?',
      [username]
    );
    
    if (rows.length === 0) {
      console.log(`User not found: ${username}`);
      await connection.end();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = rows[0];
    console.log(`User found: ${username}, ID: ${user.id}`);
    
    console.log(`Stored password hash: ${user.password}`);
    const isMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match: ${isMatch}`);
    
    if (!isMatch) {
      console.log('Password does not match');
      await connection.end();
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create JWT token using our defined constant
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '5h' }
    );
    
    await connection.end();
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/setup', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);

    try {
      await connection.execute('SELECT 1 FROM admin_users LIMIT 1');
      console.log('admin_users table exists');
    } catch (error) {
      console.log('Creating admin_users table');
      await connection.execute(`
        CREATE TABLE admin_users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          role VARCHAR(20) DEFAULT 'admin',
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    
    const [adminCheck] = await connection.execute('SELECT COUNT(*) as count FROM admin_users');
    
    if (adminCheck[0].count > 0) {
      await connection.end();
      return res.status(400).json({ message: 'Admin users already exist' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);
    
    await connection.execute(
      'INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)',
      ['admin', hashedPassword, 'admin']
    );
    
    await connection.end();
    
    res.status(201).json({ message: 'Admin user created successfully' });
  } catch (error) {
    console.error('Setup error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const authMiddleware = async (req, res, next) => {
  const token = req.header('x-auth-token');
  
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

router.get('/user', authMiddleware, async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    const [rows] = await connection.execute(
      'SELECT id, username, role FROM admin_users WHERE id = ?',
      [req.user.id]
    );
    
    await connection.end();
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = { router, authMiddleware };