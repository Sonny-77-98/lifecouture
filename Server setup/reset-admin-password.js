require('dotenv').config({ path: '/home/sonny/life-couture/.env.admin' });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function resetAdminPassword() {
  const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  };

  try {
    console.log('Connecting to database...');
    const connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully');

    const newPassword = 'admin123';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    console.log(`Generated new password hash: ${hashedPassword}`);
    
    const [result] = await connection.execute(
      'UPDATE admin_users SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );
    
    if (result.affectedRows > 0) {
      console.log('Admin password has been reset successfully');
      console.log(`Use username: admin and password: ${newPassword} to login`);
    } else {
      console.log('No admin user found. Creating a new admin user...');

      await connection.execute(
        'INSERT INTO admin_users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      
      console.log('Admin user created successfully');
      console.log(`Use username: admin and password: ${newPassword} to login`);
    }
    
    // Test the password verification
    const [user] = await connection.execute(
      'SELECT password FROM admin_users WHERE username = ?',
      ['admin']
    );
    
    if (user.length > 0) {
      const isMatch = await bcrypt.compare(newPassword, user[0].password);
      console.log(`Password verification test: ${isMatch ? 'PASSED' : 'FAILED'}`);
    }
    
    await connection.end();
    console.log('Database connection closed');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

resetAdminPassword();