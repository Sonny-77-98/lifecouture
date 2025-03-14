-- Create reference tables and triggers for Life Couture database

DELIMITER $$

CREATE TABLE IF NOT EXISTS UserReference (
    referenceID INT PRIMARY KEY AUTO_INCREMENT,
    userID INT NOT NULL,
    referenceNumber BIGINT UNIQUE NOT NULL,
    FOREIGN KEY (userID) REFERENCES User(usID) ON DELETE CASCADE
)$$

CREATE TABLE IF NOT EXISTS ProductReference (
    referenceID INT PRIMARY KEY AUTO_INCREMENT,
    productID INT NOT NULL,
    referenceNumber BIGINT UNIQUE NOT NULL,
    FOREIGN KEY (productID) REFERENCES Product(prodID) ON DELETE CASCADE
)$$

CREATE TABLE IF NOT EXISTS OrderReference (
    referenceID INT PRIMARY KEY AUTO_INCREMENT,
    orderID INT NOT NULL,
    referenceNumber BIGINT UNIQUE NOT NULL,
    FOREIGN KEY (orderID) REFERENCES Orders(orderID) ON DELETE CASCADE
)$$

CREATE TABLE IF NOT EXISTS VariantReference (
    referenceID INT PRIMARY KEY AUTO_INCREMENT,
    variantID INT NOT NULL,
    referenceNumber BIGINT UNIQUE NOT NULL,
    FOREIGN KEY (variantID) REFERENCES ProductVariants(varID) ON DELETE CASCADE
)$$


DROP TRIGGER IF EXISTS trg_after_user_insert$$
CREATE TRIGGER trg_after_user_insert
AFTER INSERT ON User
FOR EACH ROW
BEGIN
    -- Insert into reference table with numeric prefix (21 + usID)
    INSERT INTO UserReference (userID, referenceNumber)
    VALUES (NEW.usID, 21 + NEW.usID);
    
    -- Also create a new shopping cart for the user
    INSERT INTO ShoppingCart (cartCreatedAt, userID)
    VALUES (NOW(), NEW.usID);
END$$

-- Trigger to add entry in ProductReference table
DROP TRIGGER IF EXISTS trg_after_product_insert$$
CREATE TRIGGER trg_after_product_insert
AFTER INSERT ON Product
FOR EACH ROW
BEGIN
    INSERT INTO ProductReference (productID, referenceNumber)
    VALUES (NEW.prodID, 3 + NEW.prodID);
END$$

-- Trigger to add entry in OrderReference table
DROP TRIGGER IF EXISTS trg_after_order_insert$$
CREATE TRIGGER trg_after_order_insert
AFTER INSERT ON Orders
FOR EACH ROW
BEGIN
    INSERT INTO OrderReference (orderID, referenceNumber)
    VALUES (NEW.orderID, 3 + NEW.orderID);
END$$

-- Trigger to add entry in VariantReference table
DROP TRIGGER IF EXISTS trg_after_variant_insert$$
CREATE TRIGGER trg_after_variant_insert
AFTER INSERT ON ProductVariants
FOR EACH ROW
BEGIN
    INSERT INTO VariantReference (variantID, referenceNumber)
    VALUES (NEW.varID, 4 + NEW.varID);
END$$

-- Trigger to update inventory when an order is placed
DROP TRIGGER IF EXISTS trg_after_order_item_insert$$
CREATE TRIGGER trg_after_order_item_insert
AFTER INSERT ON OrderItems
FOR EACH ROW
BEGIN
    UPDATE Inventory
    SET invQty = invQty - NEW.orderVarQty
    WHERE varID = NEW.varID;
END$$

-- Trigger to update order timestamps when order status changes
DROP TRIGGER IF EXISTS trg_before_order_update$$
CREATE TRIGGER trg_before_order_update
BEFORE UPDATE ON Orders
FOR EACH ROW
BEGIN
    -- Use orderStat instead of orderStatus to match your schema
    IF OLD.orderStat <> NEW.orderStat THEN
        SET NEW.orderUpdatedAt = NOW();
    END IF;
END$$

DELIMITER ;