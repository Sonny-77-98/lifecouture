// db-setup.js
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
};

// Database name from environment variable
const DB_NAME = process.env.DB_NAME;

// SQL statements from the provided files
const tableSchemaSQL = `
-- Create Categories table
CREATE TABLE IF NOT EXISTS Categories (
    catID INT PRIMARY KEY AUTO_INCREMENT,
    catName VARCHAR(256),
    catDes TEXT,
    catStat TINYTEXT,
    catSEO TEXT
);

-- Create Product table
CREATE TABLE IF NOT EXISTS Product (
    prodID INT PRIMARY KEY AUTO_INCREMENT,
    prodTitle VARCHAR(256),
    prodDesc TEXT,
    prodURL TINYTEXT,
    prodStat VARCHAR(256)
);

-- Create ProductCategories junction table
CREATE TABLE IF NOT EXISTS ProductCategories (
    prodcatID INT PRIMARY KEY AUTO_INCREMENT,
    prodID INT,
    catID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID),
    FOREIGN KEY (catID) REFERENCES Categories(catID)
);

-- Create Vendor table
CREATE TABLE IF NOT EXISTS Vendor (
    venID INT PRIMARY KEY AUTO_INCREMENT,
    venName VARCHAR(256),
    venDes TINYTEXT,
    venURL TINYTEXT,
    venSEO TEXT,
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create Product Images table
CREATE TABLE IF NOT EXISTS ProductImages (
    imgID INT PRIMARY KEY AUTO_INCREMENT,
    imgURL TINYTEXT,
    imgAlt TINYTEXT,
    imgWidth INT,
    imgHeight INT,
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create ProductAttributes table
CREATE TABLE IF NOT EXISTS ProductAttributes (
    attID INT PRIMARY KEY AUTO_INCREMENT,
    attName VARCHAR(256),
    attType VARCHAR(256)
);

-- Create ProductVariants table
CREATE TABLE IF NOT EXISTS ProductVariants (
    varID INT PRIMARY KEY AUTO_INCREMENT,
    varSKU VARCHAR(256),
    varBCode VARCHAR(256),
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create VariantAttributesValues table
CREATE TABLE IF NOT EXISTS VariantAttributesValues (
    varID INT,
    attID INT,
    attValue VARCHAR(256),
    PRIMARY KEY (varID, attID),
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID),
    FOREIGN KEY (attID) REFERENCES ProductAttributes(attID)
);

-- Create Inventory table
CREATE TABLE IF NOT EXISTS Inventory (
    invID INT PRIMARY KEY AUTO_INCREMENT,
    invQty INT,
    InvLowStockThreshold INT,
    varID INT,
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID)
);

-- Create UserAddresses table
CREATE TABLE IF NOT EXISTS UserAddresses (
    usAdID INT PRIMARY KEY AUTO_INCREMENT,
    usAdType VARCHAR(256),
    usAdStr VARCHAR(256),
    usAdCity VARCHAR(256),
    usAdState VARCHAR(256),
    usAdPCode INT,
    usAdCountry VARCHAR(256),
    usAdIsDefault BOOLEAN
);

-- Create User table
CREATE TABLE IF NOT EXISTS User (
    usID INT PRIMARY KEY AUTO_INCREMENT,
    usFname VARCHAR(256) NOT NULL,
    usLname VARCHAR(256) NOT NULL,
    usDesc TINYTEXT,
    usPassword VARCHAR(256) NOT NULL,
    usRole VARCHAR(256),
    usPNum VARCHAR(25) NOT NULL,
    usEmail VARCHAR(256) NOT NULL,
    usAdID INT NOT NULL,
    FOREIGN KEY (usAdID) REFERENCES UserAddresses(usAdID)
);

-- Create ShoppingCart table
CREATE TABLE IF NOT EXISTS ShoppingCart (
    cartID INT PRIMARY KEY AUTO_INCREMENT,
    cartCreatedAt DATE,
    userID INT,
    FOREIGN KEY (userID) REFERENCES User(usID)
);

-- Create CartItems table
CREATE TABLE IF NOT EXISTS CartItems (
    cartItemID INT PRIMARY KEY AUTO_INCREMENT,
    cartCreatedAt DATE,
    cartQty INT,
    varID INT,
    cartID INT,
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID),
    FOREIGN KEY (cartID) REFERENCES ShoppingCart(cartID)
);

-- Create Orders table
CREATE TABLE IF NOT EXISTS Orders (
    orderID INT PRIMARY KEY AUTO_INCREMENT,
    orderStat VARCHAR(256),
    orderTotalAmt INT NOT NULL,
    orderCreatedAt DATE,
    orderUpdatedAt DATE,
    userID INT,
    FOREIGN KEY (userID) REFERENCES User(usID)
);

-- Create OrderItems table
CREATE TABLE IF NOT EXISTS OrderItems (
    orderItemID INT PRIMARY KEY AUTO_INCREMENT,
    orderVarQty INT NOT NULL,
    prodUPrice INT,
    orderID INT,
    varID INT,
    FOREIGN KEY (orderID) REFERENCES Orders(orderID),
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID)
);
`;

// Combined stored procedures
const storedProceduresSQL = `
-- Retrieve Product with Variants Procedure
CREATE PROCEDURE IF NOT EXISTS RetrieveProductWithVariants(IN prodID_param INT)
BEGIN
    SELECT p.*, pv.varID, pv.varSKU, pv.varBCode, inv.invQty, inv.InvLowStockThreshold
    FROM Product p
    LEFT JOIN ProductVariants pv ON p.prodID = pv.prodID
    LEFT JOIN Inventory inv ON pv.varID = inv.varID
    WHERE p.prodID = prodID_param;
END;

-- Retrieve Product with Categories Procedure
CREATE PROCEDURE IF NOT EXISTS RetrieveProductWithCategories(IN prodID_param INT)
BEGIN
    SELECT p.*, c.catID, c.catName, c.catDes
    FROM Product p
    JOIN ProductCategories pc ON p.prodID = pc.prodID
    JOIN Categories c ON pc.catID = c.catID
    WHERE p.prodID = prodID_param;
END;

-- Retrieve User Orders with Details Procedure
CREATE PROCEDURE IF NOT EXISTS RetrieveUserOrdersWithDetails(IN userID_param INT)
BEGIN
    SELECT o.*, oi.orderItemID, oi.orderVarQty, oi.prodUPrice, 
           pv.varSKU, p.prodTitle
    FROM Orders o
    LEFT JOIN OrderItems oi ON o.orderID = oi.orderID
    LEFT JOIN ProductVariants pv ON oi.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE o.userID = userID_param
    ORDER BY o.orderCreatedAt DESC;
END;

-- Retrieve User Shopping Cart with Items Procedure
CREATE PROCEDURE IF NOT EXISTS RetrieveUserCartWithItems(IN userID_param INT)
BEGIN
    SELECT sc.cartID, sc.cartCreatedAt, 
           ci.cartItemID, ci.cartQty, 
           pv.varSKU, p.prodTitle, p.prodID
    FROM ShoppingCart sc
    LEFT JOIN CartItems ci ON sc.cartID = ci.cartID
    LEFT JOIN ProductVariants pv ON ci.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE sc.userID = userID_param;
END;

-- Retrieve Low Stock Inventory Items Procedure
CREATE PROCEDURE IF NOT EXISTS RetrieveLowStockItems()
BEGIN
    SELECT i.invID, i.invQty, i.InvLowStockThreshold, 
           pv.varID, pv.varSKU, p.prodID, p.prodTitle
    FROM Inventory i
    JOIN ProductVariants pv ON i.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE i.invQty <= i.InvLowStockThreshold;
END;

-- Update Inventory Quantity Procedure
CREATE PROCEDURE IF NOT EXISTS UpdateInventoryQuantity(
    IN invID_param INT,
    IN newQty_param INT
)
BEGIN
    UPDATE Inventory
    SET invQty = newQty_param
    WHERE invID = invID_param;
    
    -- Return updated inventory with product information
    SELECT i.invID, i.invQty, i.InvLowStockThreshold, 
           pv.varID, pv.varSKU, p.prodID, p.prodTitle,
           (i.invQty <= i.InvLowStockThreshold) as isLowStock
    FROM Inventory i
    JOIN ProductVariants pv ON i.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE i.invID = invID_param;
END;

-- Adjust Inventory Quantity Procedure (Add or Subtract)
CREATE PROCEDURE IF NOT EXISTS AdjustInventoryQuantity(
    IN invID_param INT,
    IN adjustment_param INT
)
BEGIN
    UPDATE Inventory
    SET invQty = invQty + adjustment_param
    WHERE invID = invID_param;
    
    -- Return updated inventory with product information
    SELECT i.invID, i.invQty, i.InvLowStockThreshold, 
           pv.varID, pv.varSKU, p.prodID, p.prodTitle,
           (i.invQty <= i.InvLowStockThreshold) as isLowStock
    FROM Inventory i
    JOIN ProductVariants pv ON i.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE i.invID = invID_param;
END;

-- Insert Product with Prefix Procedure
CREATE PROCEDURE IF NOT EXISTS InsertProductWithPrefix(
    IN prodTitle_param VARCHAR(256),
    IN prodDesc_param TEXT,
    IN prodURL_param TINYTEXT,
    IN prodStat_param VARCHAR(256)
)
BEGIN
    DECLARE new_prodID INT;
    DECLARE prefixed_prodID VARCHAR(256);
    
    -- Insert new product record
    INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat)
    VALUES (prodTitle_param, prodDesc_param, prodURL_param, prodStat_param);
    
    -- Get the last inserted ID
    SET new_prodID = LAST_INSERT_ID();
    
    -- Add prefix "PROD" to the new product ID
    SET prefixed_prodID = CONCAT('PROD', new_prodID);
    
    -- Update the prodID with the prefixed ID
    UPDATE Product
    SET prodID = prefixed_prodID
    WHERE prodID = new_prodID;
    
    -- Return the new product ID
    SELECT prefixed_prodID AS newProductID;
END;

-- Process Order from Cart Procedure
CREATE PROCEDURE IF NOT EXISTS ProcessOrderFromCart(
    IN userID_param INT,
    IN shippingAddress_param INT
)
BEGIN
    DECLARE cartID_param INT;
    DECLARE orderTotal INT DEFAULT 0;
    DECLARE newOrderID INT;
    
    -- Start transaction
    START TRANSACTION;
    
    -- Get user's cart ID
    SELECT cartID INTO cartID_param
    FROM ShoppingCart
    WHERE userID = userID_param;
    
    -- Calculate order total
    SELECT SUM(ci.cartQty * p.prodPrice) INTO orderTotal
    FROM CartItems ci
    JOIN ProductVariants pv ON ci.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE ci.cartID = cartID_param;
    
    -- Create new order
    INSERT INTO Orders (orderStat, orderTotalAmt, orderCreatedAt, orderUpdatedAt, userID)
    VALUES ('Pending', orderTotal, NOW(), NOW(), userID_param);
    
    SET newOrderID = LAST_INSERT_ID();
    
    -- Transfer cart items to order items
    INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID)
    SELECT ci.cartQty, p.prodPrice, newOrderID, ci.varID
    FROM CartItems ci
    JOIN ProductVariants pv ON ci.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE ci.cartID = cartID_param;
    
    -- Update inventory quantities
    UPDATE Inventory i
    JOIN CartItems ci ON i.varID = ci.varID
    SET i.invQty = i.invQty - ci.cartQty
    WHERE ci.cartID = cartID_param;
    
    -- Clear the cart
    DELETE FROM CartItems WHERE cartID = cartID_param;
    
    -- Commit transaction
    COMMIT;
    
    -- Return the new order details
    SELECT o.*, oi.orderItemID, oi.orderVarQty, oi.prodUPrice, 
           pv.varSKU, p.prodTitle
    FROM Orders o
    LEFT JOIN OrderItems oi ON o.orderID = oi.orderID
    LEFT JOIN ProductVariants pv ON oi.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE o.orderID = newOrderID;
END;

-- Add Item to Cart Procedure
CREATE PROCEDURE IF NOT EXISTS AddItemToCart(
    IN userID_param INT,
    IN varID_param INT,
    IN quantity_param INT
)
BEGIN
    DECLARE cartID_param INT;
    DECLARE existingCartItemID INT;
    DECLARE existingQty INT;
    
    -- Check if user has a cart
    SELECT cartID INTO cartID_param
    FROM ShoppingCart
    WHERE userID = userID_param;
    
    -- If no cart exists, create one
    IF cartID_param IS NULL THEN
        INSERT INTO ShoppingCart (cartCreatedAt, userID)
        VALUES (NOW(), userID_param);
        
        SET cartID_param = LAST_INSERT_ID();
    END IF;
    
    -- Check if item already exists in cart
    SELECT cartItemID, cartQty INTO existingCartItemID, existingQty
    FROM CartItems
    WHERE cartID = cartID_param AND varID = varID_param;
    
    -- If item exists, update quantity
    IF existingCartItemID IS NOT NULL THEN
        UPDATE CartItems
        SET cartQty = existingQty + quantity_param
        WHERE cartItemID = existingCartItemID;
    ELSE
        -- If item doesn't exist, add new cart item
        INSERT INTO CartItems (cartCreatedAt, cartQty, varID, cartID)
        VALUES (NOW(), quantity_param, varID_param, cartID_param);
    END IF;
    
    -- Return updated cart
    SELECT sc.cartID, sc.cartCreatedAt, 
           ci.cartItemID, ci.cartQty, 
           pv.varSKU, p.prodTitle, p.prodID
    FROM ShoppingCart sc
    LEFT JOIN CartItems ci ON sc.cartID = ci.cartID
    LEFT JOIN ProductVariants pv ON ci.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE sc.cartID = cartID_param;
END;
`;

// Function to execute SQL scripts
async function executeSQLScripts() {
  let connection;
  let dbConnection;
  
  try {
    // First connect to MySQL server without specifying a database
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL server');
    
    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${DB_NAME}`);
    console.log(`Database '${DB_NAME}' created or already exists`);
    
    // Close initial connection
    await connection.end();
    
    // Connect to the specific database
    const dbConnectionConfig = {
      ...dbConfig,
      database: DB_NAME,
      multipleStatements: true // Enable multiple statements for procedures
    };
    
    dbConnection = await mysql.createConnection(dbConnectionConfig);
    console.log(`Connected to database '${DB_NAME}'`);
    
    // Execute table creation script
    console.log('Creating database tables...');
    await dbConnection.query(tableSchemaSQL);
    console.log('Database tables created successfully');
    
    // Execute stored procedures script
    console.log('Creating stored procedures...');
    await dbConnection.query(storedProceduresSQL);
    console.log('Stored procedures created successfully');
    
    console.log('Database setup complete!');
    
  } catch (error) {
    console.error('Error setting up database:', error);
  } finally {
    // Close the connections
    if (connection && connection.end) await connection.end();
    if (dbConnection && dbConnection.end) await dbConnection.end();
  }
}

// Execute the setup
executeSQLScripts();