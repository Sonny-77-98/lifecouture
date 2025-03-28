-- Retrieve Product with Variants Procedure
DELIMITER $$
CREATE PROCEDURE RetrieveProductWithVariants(IN prodID_param INT)
BEGIN
    SELECT p.*, pv.varID, pv.varSKU, pv.varBCode, inv.invQty, inv.InvLowStockThreshold
    FROM Product p
    LEFT JOIN ProductVariants pv ON p.prodID = pv.prodID
    LEFT JOIN Inventory inv ON pv.varID = inv.varID
    WHERE p.prodID = prodID_param;
END$$
DELIMITER ;

-- Retrieve Product with Categories Procedure
DELIMITER $$
CREATE PROCEDURE RetrieveProductWithCategories(IN prodID_param INT)
BEGIN
    SELECT p.*, c.catID, c.catName, c.catDes
    FROM Product p
    JOIN ProductCategories pc ON p.prodID = pc.prodID
    JOIN Categories c ON pc.catID = c.catID
    WHERE p.prodID = prodID_param;
END$$
DELIMITER ;

-- Retrieve User Orders with Details Procedure
DELIMITER $$
CREATE PROCEDURE RetrieveUserOrdersWithDetails(IN userID_param INT)
BEGIN
    SELECT o.*, oi.orderItemID, oi.orderVarQty, oi.prodUPrice, 
           pv.varSKU, p.prodTitle
    FROM Orders o
    LEFT JOIN OrderItems oi ON o.orderID = oi.orderID
    LEFT JOIN ProductVariants pv ON oi.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE o.userID = userID_param
    ORDER BY o.orderCreatedAt DESC;
END$$
DELIMITER ;

-- Retrieve User Shopping Cart with Items Procedure
DELIMITER $$
CREATE PROCEDURE RetrieveUserCartWithItems(IN userID_param INT)
BEGIN
    SELECT sc.cartID, sc.cartCreatedAt, 
           ci.cartItemID, ci.cartQty, 
           pv.varSKU, p.prodTitle, p.prodID
    FROM ShoppingCart sc
    LEFT JOIN CartItems ci ON sc.cartID = ci.cartID
    LEFT JOIN ProductVariants pv ON ci.varID = pv.varID
    LEFT JOIN Product p ON pv.prodID = p.prodID
    WHERE sc.userID = userID_param;
END$$
DELIMITER ;

-- Retrieve Low Stock Inventory Items Procedure
DELIMITER $$
CREATE PROCEDURE RetrieveLowStockItems()
BEGIN
    SELECT i.invID, i.invQty, i.InvLowStockThreshold, 
           pv.varID, pv.varSKU, p.prodID, p.prodTitle
    FROM Inventory i
    JOIN ProductVariants pv ON i.varID = pv.varID
    JOIN Product p ON pv.prodID = p.prodID
    WHERE i.invQty <= i.InvLowStockThreshold;
END$$
DELIMITER ;

-- Update Inventory Quantity Procedure
DELIMITER $$
CREATE PROCEDURE UpdateInventoryQuantity(
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
END$$
DELIMITER ;

-- Adjust Inventory Quantity Procedure (Add or Subtract)
DELIMITER $$
CREATE PROCEDURE AdjustInventoryQuantity(
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
END$$
DELIMITER ;

-- Insert Product with Prefix Procedure
DELIMITER $$
CREATE PROCEDURE InsertProductWithPrefix(
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
END$$
DELIMITER ;

-- Process Order from Cart Procedure
DELIMITER $$
CREATE PROCEDURE ProcessOrderFromCart(
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
END$$
DELIMITER ;

-- Add Item to Cart Procedure
DELIMITER $$
CREATE PROCEDURE AddItemToCart(
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
END$$
DELIMITER ;