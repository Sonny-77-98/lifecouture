-- Create Categories table
CREATE TABLE Categories (
    catID INT PRIMARY KEY AUTO_INCREMENT,
    catName VARCHAR(256),
    catDes TEXT,
    catStat TINYTEXT,
    catSEO TEXT
);

-- Create Product table
CREATE TABLE Product (
    prodID INT PRIMARY KEY AUTO_INCREMENT,
    prodTitle VARCHAR(256),
    prodDesc TEXT,
    prodURL TINYTEXT,
    prodStat VARCHAR(256)
);

-- Create ProductCategories junction table
CREATE TABLE ProductCategories (
    prodcatID INT PRIMARY KEY AUTO_INCREMENT,
    prodID INT,
    catID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID),
    FOREIGN KEY (catID) REFERENCES Categories(catID)
);

-- Create Vendor table
CREATE TABLE Vendor (
    venID INT PRIMARY KEY AUTO_INCREMENT,
    venName VARCHAR(256),
    venDes TINYTEXT,
    venURL TINYTEXT,
    venSEO TEXT,
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create Product Images table
CREATE TABLE ProductImages (
    imgID INT PRIMARY KEY AUTO_INCREMENT,
    imgURL TINYTEXT,
    imgAlt TINYTEXT,
    imgWidth INT,
    imgHeight INT,
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create ProductAttributes table
CREATE TABLE ProductAttributes (
    attID INT PRIMARY KEY AUTO_INCREMENT,
    attName VARCHAR(256),
    attType VARCHAR(256)
);

-- Create ProductVariants table
CREATE TABLE ProductVariants (
    varID INT PRIMARY KEY AUTO_INCREMENT,
    varSKU VARCHAR(256),
    varBCode VARCHAR(256),
    prodID INT,
    FOREIGN KEY (prodID) REFERENCES Product(prodID)
);

-- Create VariantAttributesValues table
CREATE TABLE VariantAttributesValues (
    varID INT,
    attID INT,
    attValue VARCHAR(256),
    PRIMARY KEY (varID, attID),
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID),
    FOREIGN KEY (attID) REFERENCES ProductAttributes(attID)
);

-- Create Inventory table
CREATE TABLE Inventory (
    invID INT PRIMARY KEY AUTO_INCREMENT,
    invQty INT,
    InvLowStockThreshold INT,
    varID INT,
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID)
);

-- Create UserAddresses table
CREATE TABLE UserAddresses (
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
CREATE TABLE User (
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
CREATE TABLE ShoppingCart (
    cartID INT PRIMARY KEY AUTO_INCREMENT,
    cartCreatedAt DATE,
    userID INT,
    FOREIGN KEY (userID) REFERENCES User(usID)
);

-- Create CartItems table
CREATE TABLE CartItems (
    cartItemID INT PRIMARY KEY AUTO_INCREMENT,
    cartCreatedAt DATE,
    cartQty INT,
    varID INT,
    cartID INT,
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID),
    FOREIGN KEY (cartID) REFERENCES ShoppingCart(cartID)
);

-- Create Orders table
CREATE TABLE Orders (
    orderID INT PRIMARY KEY AUTO_INCREMENT,
    orderStat VARCHAR(256),
    orderTotalAmt INT NOT NULL,
    orderCreatedAt DATE,
    orderUpdatedAt DATE,
    userID INT,
    FOREIGN KEY (userID) REFERENCES User(usID)
);

-- Create OrderItems table
CREATE TABLE OrderItems (
    orderItemID INT PRIMARY KEY AUTO_INCREMENT,
    orderVarQty INT NOT NULL,
    prodUPrice INT,
    orderID INT,
    varID INT,
    FOREIGN KEY (orderID) REFERENCES Orders(orderID),
    FOREIGN KEY (varID) REFERENCES ProductVariants(varID)
);
