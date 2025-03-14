// all-setup.js
// Main setup script that orchestrates the execution of all database setup files
require('dotenv').config();
const path = require('path');

console.log('===== Life Couture Database Setup =====');
console.log('Starting database initialization process...');

// Function to run setup scripts sequentially
async function runSetupScripts() {
  try {
    console.log('\n--- Running database and table setup ---');
    await require('./config/db-setup');
    console.log('Database and tables setup completed successfully');
    
    console.log('\n--- Running stored procedures setup ---');
    await require('./config/procedure-setup');
    console.log('Stored procedures setup completed successfully');
    
    console.log('\n--- Running triggers setup ---');
    await require('./config/trigger-setup');
    console.log('Triggers setup completed successfully');
    
    console.log('\n===== Database Setup Complete =====');
    console.log('Life Couture database is now ready for use!');
    
    // Exit process with success code
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during setup process:', error);
    process.exit(1);
  }
}

runSetupScripts().catch(err => {
  console.error('Fatal error in setup process:', err);
  process.exit(1);
});