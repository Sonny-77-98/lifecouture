// dataService.js - Data access layer for Life Couture database
require('dotenv').config();
const { query } = require('./db');

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

      const userId = result.insertId;

      // Get the reference number from UserReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM UserReference WHERE userID = ?',
        [userId]
      );

      // Return the created user with reference number
      return {
        userId,
        referenceNumber: referenceData[0]?.referenceNumber,
        ...userData,
        password: undefined // Don't return the password
      };
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  },

  /**
   * Get user by ID with reference number
   * @param {number} userId - User ID
   * @returns {Object} - User data with reference number
   */
  async getUserById(userId) {
    try {
      const [user] = await query(
        `SELECT u.*, ur.referenceNumber 
         FROM User u
         JOIN UserReference ur ON u.usID = ur.userID
         WHERE u.usID = ?`,
        [userId]
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

      const productId = result.insertId;

      // Get the reference number from ProductReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM ProductReference WHERE productID = ?',
        [productId]
      );

      // If there are categories, associate them with the product
      if (productData.categories && productData.categories.length > 0) {
        for (const categoryId of productData.categories) {
          await query(
            'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
            [productId, categoryId]
          );
        }
      }

      // Return the created product with reference number
      return {
        productId,
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
          variantData.productId
        ]
      );

      const variantId = result.insertId;

      // Get the reference number from VariantReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM VariantReference WHERE variantID = ?',
        [variantId]
      );

      // Add attribute values if provided
      if (variantData.attributes && Object.keys(variantData.attributes).length > 0) {
        for (const [attributeId, value] of Object.entries(variantData.attributes)) {
          await query(
            'INSERT INTO VariantAttributesValues (varID, attID, attValue) VALUES (?, ?, ?)',
            [variantId, attributeId, value]
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
            variantId
          ]
        );
      }

      // Return the created variant with reference number
      return {
        variantId,
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
   * @param {number} productId - Product ID
   * @returns {Object} - Product data with reference number and variants
   */
  async getProductById(productId) {
    try {
      // Get product details
      const [product] = await query(
        `SELECT p.*, pr.referenceNumber 
         FROM Product p
         JOIN ProductReference pr ON p.prodID = pr.productID
         WHERE p.prodID = ?`,
        [productId]
      );

      if (!product) return null;

      // Get product variants
      const variants = await query(
        `SELECT pv.*, vr.referenceNumber 
         FROM ProductVariants pv
         JOIN VariantReference vr ON pv.varID = vr.variantID
         WHERE pv.prodID = ?`,
        [productId]
      );

      // Get product categories
      const categories = await query(
        `SELECT c.* 
         FROM Categories c
         JOIN ProductCategories pc ON c.catID = pc.catID
         WHERE pc.prodID = ?`,
        [productId]
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
          orderData.userId
        ]
      );

      const orderId = result.insertId;

      // Get the reference number from OrderReference (created by trigger)
      const referenceData = await query(
        'SELECT referenceNumber FROM OrderReference WHERE orderID = ?',
        [orderId]
      );

      // Add order items
      for (const item of orderData.items) {
        await query(
          `INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID) 
           VALUES (?, ?, ?, ?)`,
          [
            item.quantity,
            item.unitPrice,
            orderId,
            item.variantId
          ]
        );
      }

      // Return the created order with reference number
      return {
        orderId,
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
   * @param {number} orderId - Order ID
   * @returns {Object} - Order data with reference number and items
   */
  async getOrderById(orderId) {
    try {
      // Get order details
      const [order] = await query(
        `SELECT o.*, orr.referenceNumber 
         FROM Orders o
         JOIN OrderReference orr ON o.orderID = orr.orderID
         WHERE o.orderID = ?`,
        [orderId]
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
        [orderId]
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
   * @param {number} orderId - Order ID
   * @param {string} status - New status
   * @returns {Object} - Updated order
   */
  async updateOrderStatus(orderId, status) {
    try {
      await query(
        'UPDATE Orders SET orderStat = ? WHERE orderID = ?',
        [status, orderId]
      );

      return await this.getOrderById(orderId);
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
   * @param {number} userId - User ID
   * @param {number} variantId - Variant ID
   * @param {number} quantity - Quantity
   * @returns {Object} - Updated cart
   */
  async addToCart(userId, variantId, quantity) {
    try {
      // Using the stored procedure from your SQL
      await query(
        'CALL AddItemToCart(?, ?, ?)',
        [userId, variantId, quantity]
      );

      return await this.getCart(userId);
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  },

  /**
   * Get user's cart
   * @param {number} userId - User ID
   * @returns {Object} - Cart with items
   */
  async getCart(userId) {
    try {
      // Using the stored procedure from your SQL
      const cartData = await query(
        'CALL RetrieveUserCartWithItems(?)',
        [userId]
      );

      return cartData[0]; // First result set contains the cart items
    } catch (error) {
      console.error('Error getting cart:', error);
      throw error;
    }
  },

  /**
   * Remove item from cart
   * @param {number} cartItemId - Cart item ID
   * @returns {boolean} - Success status
   */
  async removeCartItem(cartItemId) {
    try {
      await query(
        'DELETE FROM CartItems WHERE cartItemID = ?',
        [cartItemId]
      );
      return true;
    } catch (error) {
      console.error('Error removing cart item:', error);
      throw error;
    }
  },

  /**
   * Update cart item quantity
   * @param {number} cartItemId - Cart item ID
   * @param {number} quantity - New quantity
   * @returns {Object} - Updated cart item
   */
  async updateCartItemQuantity(cartItemId, quantity) {
    try {
      await query(
        'UPDATE CartItems SET cartQty = ? WHERE cartItemID = ?',
        [quantity, cartItemId]
      );

      const [updatedItem] = await query(
        'SELECT * FROM CartItems WHERE cartItemID = ?',
        [cartItemId]
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