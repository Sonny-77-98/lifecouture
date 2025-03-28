require('dotenv').config();
const { query } = require('../backend/config/db');

/**
 * User related functions
 */
const userService = {
  /**
   * Add a new user to the database
   * @param {Object} userData - User data
   * @returns {Object} - Newly created user with reference number
   */
  async addUser(userData) {
    try {
      // Insert the user
      const result = await query(
        `INSERT INTO User (usFname, usLname, usDesc, usPassword, usRole, usPNum, usEmail, usAdID) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.firstName,
          userData.lastName,
          userData.description || null,
          userData.password, // Note: Should be hashed before passing to this function
          userData.role || 'customer',
          userData.phoneNumber,
          userData.email,
          userData.addressId
        ]
      );

      const usID = result.insertId;

      // Get the reference number from UserReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM UserReference WHERE userID = ?',
        [usID]
      );

      // Return the created user with reference number
      return {
        usID,
        referenceNumber: referenceData[0]?.referenceNumber,
        ...userData,
        password: undefined
      };
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  /**
   * Get user by ID with reference number
   * @param {number} usID - User ID
   * @returns {Object} - User data with reference number
   */
  async getUserById(usID) {
    try {
      const [user] = await query(
        `SELECT u.*, ur.referenceNumber 
         FROM User u
         JOIN UserReference ur ON u.usID = ur.userID
         WHERE u.usID = ?`,
        [usID]
      );
      return user;
    } catch (error) {
      console.error('Error getting user:', error);
      throw error;
    }
  }
};

/**
 * Product related functions
 */
const productService = {
  /**
   * Add a new product to the database
   * @param {Object} productData - Product data
   * @returns {Object} - Newly created product with reference number
   */
  async addProduct(productData) {
    try {
      // Insert the product
      const result = await query(
        `INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) 
         VALUES (?, ?, ?, ?)`,
        [
          productData.title,
          productData.description,
          productData.url || null,
          productData.status || 'active'
        ]
      );

      const prodID = result.insertId;

      // Get the reference number from ProductReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM ProductReference WHERE productID = ?',
        [prodID]
      );

      // If there are categories, associate them with the product
      if (productData.categories && productData.categories.length > 0) {
        for (const catID of productData.categories) {
          await query(
            'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
            [prodID, catID]
          );
        }
      }

      // Return the created product with reference number
      return {
        prodID,
        referenceNumber: referenceData[0]?.referenceNumber,
        ...productData
      };
    } catch (error) {
      console.error('Error adding product:', error);
      throw error;
    }
  },

  /**
   * Add a product variant
   * @param {Object} variantData - Variant data
   * @returns {Object} - Newly created variant with reference number
   */
  async addProductVariant(variantData) {
    try {
      // Insert the product variant
      const result = await query(
        `INSERT INTO ProductVariants (varSKU, varBCode, prodID) 
         VALUES (?, ?, ?)`,
        [
          variantData.sku,
          variantData.barcode || null,
          variantData.prodID
        ]
      );

      const varID = result.insertId;

      // Get the reference number from VariantReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM VariantReference WHERE variantID = ?',
        [varID]
      );

      // Add attribute values if provided
      if (variantData.attributes && Object.keys(variantData.attributes).length > 0) {
        for (const [attID, value] of Object.entries(variantData.attributes)) {
          await query(
            'INSERT INTO VariantAttributesValues (varID, attID, attValue) VALUES (?, ?, ?)',
            [varID, attID, value]
          );
        }
      }

      // Add inventory entry if quantity is provided
      if (variantData.quantity !== undefined) {
        await query(
          'INSERT INTO Inventory (invQty, InvLowStockThreshold, varID) VALUES (?, ?, ?)',
          [
            variantData.quantity,
            variantData.lowStockThreshold || 5,
            varID
          ]
        );
      }

      // Return the created variant with reference number
      return {
        varID,
        referenceNumber: referenceData[0]?.referenceNumber,
        ...variantData
      };
    } catch (error) {
      console.error('Error adding product variant:', error);
      throw error;
    }
  },

  /**
   * Get product by ID with reference number
   * @param {number} prodID - Product ID
   * @returns {Object} - Product data with reference number and variants
   */
  async getProductById(prodID) {
    try {
      // Get product details
      const [product] = await query(
        `SELECT p.*, pr.referenceNumber 
         FROM Product p
         JOIN ProductReference pr ON p.prodID = pr.productID
         WHERE p.prodID = ?`,
        [prodID]
      );

      if (!product) return null;

      // Get product variants
      const variants = await query(
        `SELECT pv.*, vr.referenceNumber 
         FROM ProductVariants pv
         JOIN VariantReference vr ON pv.varID = vr.variantID
         WHERE pv.prodID = ?`,
        [prodID]
      );

      // Get product categories
      const categories = await query(
        `SELECT c.* 
         FROM Categories c
         JOIN ProductCategories pc ON c.catID = pc.catID
         WHERE pc.prodID = ?`,
        [prodID]
      );

      return {
        ...product,
        variants,
        categories
      };
    } catch (error) {
      console.error('Error getting product:', error);
      throw error;
    }
  }
};

/**
 * Order related functions
 */
const orderService = {
  /**
   * Create a new order
   * @param {Object} orderData - Order data
   * @returns {Object} - Newly created order with reference number
   */
  async createOrder(orderData) {
    try {
      // Insert the order
      const result = await query(
        `INSERT INTO Orders (orderStat, orderTotalAmt, orderCreatedAt, orderUpdatedAt, userID) 
         VALUES (?, ?, NOW(), NOW(), ?)`,
        [
          'pending',
          orderData.totalAmount,
          orderData.usID
        ]
      );

      const orderID = result.insertId;

      // Get the reference number from OrderReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM OrderReference WHERE orderID = ?',
        [orderID]
      );

      // Add order items
      for (const item of orderData.items) {
        await query(
          `INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID) 
           VALUES (?, ?, ?, ?)`,
          [
            item.quantity,
            item.unitPrice,
            orderID,
            item.varID
          ]
        );
      }

      // Return the created order with reference number
      return {
        orderID,
        referenceNumber: referenceData[0]?.referenceNumber,
        status: 'pending',
        createdAt: new Date(),
        ...orderData
      };
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  },

  /**
   * Get order by ID with reference number
   * @param {number} orderID - Order ID
   * @returns {Object} - Order data with reference number and items
   */
  async getOrderById(orderID) {
    try {
      // Get order details
      const [order] = await query(
        `SELECT o.*, orr.referenceNumber 
         FROM Orders o
         JOIN OrderReference orr ON o.orderID = orr.orderID
         WHERE o.orderID = ?`,
        [orderID]
      );

      if (!order) return null;

      // Get order items
      const items = await query(
        `SELECT oi.*, pv.varSKU, p.prodTitle, vr.referenceNumber as variantReferenceNumber
         FROM OrderItems oi
         JOIN ProductVariants pv ON oi.varID = pv.varID
         JOIN Product p ON pv.prodID = p.prodID
         JOIN VariantReference vr ON pv.varID = vr.variantID
         WHERE oi.orderID = ?`,
        [orderID]
      );

      return {
        ...order,
        items
      };
    } catch (error) {
      console.error('Error getting order:', error);
      throw error;
    }
  },

  /**
   * Update order status
   * @param {number} orderID - Order ID
   * @param {string} status - New status
   * @returns {Object} - Updated order
   */
  async updateOrderStatus(orderID, status) {
    try {
      await query(
        'UPDATE Orders SET orderStat = ? WHERE orderID = ?',
        [status, orderID]
      );

      return await this.getOrderById(orderID);
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }
};

/**
 * Shopping cart related functions
 */
const cartService = {
  /**
   * Add item to user's cart
   * @param {number} usID - User ID
   * @param {number} varID - Variant ID
   * @param {number} quantity - Quantity
   * @returns {Object} - Updated cart
   */
  async addToCart(usID, varID, quantity) {
    try {
      // Using the stored procedure from your SQL
      await query(
        'CALL AddItemToCart(?, ?, ?)',
        [usID, varID, quantity]
      );

      return await this.getCart(usID);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  /**
   * Get user's cart
   * @param {number} usID - User ID
   * @returns {Object} - Cart with items
   */
  async getCart(usID) {
    try {
      // Using the stored procedure from your SQL
      const cartData = await query(
        'CALL RetrieveUserCartWithItems(?)',
        [usID]
      );

      return cartData[0]; // First result set contains the cart items
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  },

  /**
   * Remove item from cart
   * @param {number} cartItemID - Cart item ID
   * @returns {boolean} - Success status
   */
  async removeCartItem(cartItemID) {
    try {
      await query(
        'DELETE FROM CartItems WHERE cartItemID = ?',
        [cartItemID]
      );
      return true;
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  },

  /**
   * Update cart item quantity
   * @param {number} cartItemID - Cart item ID
   * @param {number} quantity - New quantity
   * @returns {Object} - Updated cart item
   */
  async updateCartItemQuantity(cartItemID, quantity) {
    try {
      await query(
        'UPDATE CartItems SET cartQty = ? WHERE cartItemID = ?',
        [quantity, cartItemID]
      );

      const [updatedItem] = await query(
        'SELECT * FROM CartItems WHERE cartItemID = ?',
        [cartItemID]
      );

      return updatedItem;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }
};

module.exports = {
  userService,
  productService,
  orderService,
  cartService
};