// procedureService.js - Service layer utilizing stored procedures for Life Couture
require('dotenv').config();
const { query } = require('./db');

/**
 * Product services using stored procedures
 */
const productProcedureService = {
  /**
   * Retrieve product with all its variants
   * @param {number} productId 
   * @returns {Object}
   */
  async getProductWithVariants(productId) {
    try {
      const results = await query('CALL RetrieveProductWithVariants(?)', [productId]);
      return results[0];
    } catch (error) {
      console.error('Error retrieving product with variants:', error);
      throw error;
    }
  },

  /**
   * Retrieve product with all its categories
   * @param {number} productId 
   * @returns {Object}
   */
  async getProductWithCategories(productId) {
    try {
      const results = await query('CALL RetrieveProductWithCategories(?)', [productId]);
      return results[0];
    } catch (error) {
      console.error('Error retrieving product with categories:', error);
      throw error;
    }
  },

  /**
   * Insert new product with prefix
   * @param {Object} productData - Product data
   * @returns {Object} - New product with prefixed ID
   */
  async insertProductWithPrefix(productData) {
    try {
      const results = await query(
        'CALL InsertProductWithPrefix(?, ?, ?, ?)',
        [
          productData.title,
          productData.description,
          productData.url || null,
          productData.status || 'active'
        ]
      );
      
      // Extract the prefixed product ID
      const newProductID = results[0][0].newProductID;
      
      return {
        ...productData,
        productId: newProductID
      };
    } catch (error) {
      console.error('Error inserting product with prefix:', error);
      throw error;
    }
  }
};

/**
 * Order services using stored procedures
 */
const orderProcedureService = {
  /**
   * Retrieve all orders for a user with details
   * @param {number} userId - User ID
   * @returns {Array} - User's orders with details
   */
  async getUserOrdersWithDetails(userId) {
    try {
      const results = await query('CALL RetrieveUserOrdersWithDetails(?)', [userId]);
      return results[0];
    } catch (error) {
      console.error('Error retrieving user orders:', error);
      throw error;
    }
  },

  /**
   * Process an order from user's cart
   * @param {number} userId - User ID
   * @param {number} shippingAddressId - Shipping address ID
   * @returns {Object} - Processed order details
   */
  async processOrderFromCart(userId, shippingAddressId) {
    try {
      const results = await query(
        'CALL ProcessOrderFromCart(?, ?)',
        [userId, shippingAddressId]
      );
      
      return results[0];
    } catch (error) {
      console.error('Error processing order from cart:', error);
      throw error;
    }
  }
};

/**
 * Cart services using stored procedures
 */
const cartProcedureService = {
  /**
   * Retrieve user's shopping cart with items
   * @param {number} userId - User ID
   * @returns {Object} - User's cart with items
   */
  async getUserCartWithItems(userId) {
    try {
      const results = await query('CALL RetrieveUserCartWithItems(?)', [userId]);
      return results[0]; 
    } catch (error) {
      console.error('Error retrieving user cart:', error);
      throw error;
    }
  },

  /**
   * Add item to user's cart
   * @param {number} userId - 
   * @param {number} varID
   * @param {number} quantity 
   * @returns {Object} 
   */
  async addItemToCart(userId, varID, quantity) {
    try {
      const results = await query(
        'CALL AddItemToCart(?, ?, ?)',
        [userId, varID, quantity]
      );
      
      return results[0]; // First result set contains updated cart
    } catch (error) {
      console.error('Error adding item to cart:', error);
      throw error;
    }
  }
};

/**
 * Inventory services using stored procedures
 */
const inventoryProcedureService = {
  /**
   * Retrieve all low stock inventory items
   * @returns {Array} - Low stock items
   */
  async getLowStockItems() {
    try {
      const results = await query('CALL RetrieveLowStockItems()');
      return results[0]; // First result set contains low stock items
    } catch (error) {
      console.error('Error retrieving low stock items:', error);
      throw error;
    }
  },

  /**
   * Update inventory quantity
   * @param {number} inventoryId - Inventory ID
   * @param {number} newQuantity - New quantity
   * @returns {Object} - Updated inventory item
   */
  async updateInventoryQuantity(inventoryId, newQuantity) {
    try {
      const results = await query(
        'CALL UpdateInventoryQuantity(?, ?)',
        [inventoryId, newQuantity]
      );
      
      return results[0][0]; // First row of first result set contains updated inventory
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
      throw error;
    }
  },

  /**
   * Adjust inventory quantity (add or subtract)
   * @param {number} inventoryId - Inventory ID
   * @param {number} adjustment - Quantity adjustment (positive to add, negative to subtract)
   * @returns {Object} - Updated inventory item
   */
  async adjustInventoryQuantity(inventoryId, adjustment) {
    try {
      const results = await query(
        'CALL AdjustInventoryQuantity(?, ?)',
        [inventoryId, adjustment]
      );
      
      return results[0][0]; // First row of first result set contains updated inventory
    } catch (error) {
      console.error('Error adjusting inventory quantity:', error);
      throw error;
    }
  }
};

module.exports = {
  productProcedureService,
  orderProcedureService,
  cartProcedureService,
  inventoryProcedureService
};