const express = require('express');
const { query } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API endpoint to get all products
app.get('/api/products', async (req, res) => {
  try {
    // Use the query function from your db.js file
    const products = await query('SELECT * FROM Product');
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get featured products with inventory information
app.get('/api/products/featured', async (req, res) => {
  try {
    const featuredProducts = await query(`
      SELECT 
        p.prodID, 
        p.prodTitle, 
        p.prodDesc, 
        p.prodURL,
        COUNT(DISTINCT pv.varID) AS variantCount,
        SUM(i.invQty) AS totalInventory,
        MIN(i.invQty) AS minInventory
      FROM 
        Product p
      LEFT JOIN 
        ProductVariants pv ON p.prodID = pv.prodID
      LEFT JOIN 
        Inventory i ON pv.varID = i.varID
      WHERE 
        p.prodStat = 'Active'
      GROUP BY 
        p.prodID, p.prodTitle, p.prodDesc, p.prodURL
      LIMIT 10
    `);
    
    res.json(featuredProducts);
  } catch (error) {
    console.error('Error fetching featured products:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// Get detailed information for a single product
app.get('/api/products/:id', async (req, res) => {
  try {
    // Get the basic product information
    const [product] = await query('SELECT * FROM Product WHERE prodID = ?', [req.params.id]);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get variants for this product
    const variants = await query(`
      SELECT 
        pv.varID, 
        pv.varSKU, 
        pv.varBCode,
        i.invQty,
        i.InvLowStockThreshold
      FROM 
        ProductVariants pv
      LEFT JOIN 
        Inventory i ON pv.varID = i.varID
      WHERE 
        pv.prodID = ?
    `, [req.params.id]);
    
    // Get variant attributes
    const variantIds = variants.map(v => v.varID);
    
    let attributes = [];
    if (variantIds.length > 0) {
      attributes = await query(`
        SELECT 
          vav.varID,
          pa.attName,
          vav.attValue
        FROM 
          VariantAttributesValues vav
        JOIN 
          ProductAttributes pa ON vav.attID = pa.attID
        WHERE 
          vav.varID IN (?)
      `, [variantIds]);
    }
    
    // Get product images
    const images = await query(`
      SELECT 
        imgID, 
        imgURL, 
        imgAlt, 
        imgWidth, 
        imgHeight
      FROM 
        ProductImages
      WHERE 
        prodID = ?
    `, [req.params.id]);
    
    // Organize attributes by variant
    const variantsWithAttributes = variants.map(variant => {
      const variantAttributes = attributes
        .filter(attr => attr.varID === variant.varID)
        .map(attr => ({
          name: attr.attName,
          value: attr.attValue
        }));
      
      return {
        ...variant,
        attributes: variantAttributes
      };
    });
    
    // Combine all data
    const result = {
      ...product,
      variants: variantsWithAttributes,
      images: images
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching product details:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// Example 2: Retrieve order history for a user
app.get('/api/users/:id/orders', async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get all orders for this user
    const orders = await query(`
      SELECT 
        o.orderID, 
        o.orderStat, 
        o.orderTotalAmt,
        o.orderCreatedAt, 
        o.orderUpdatedAt
      FROM 
        Orders o
      WHERE 
        o.userID = ?
      ORDER BY 
        o.orderCreatedAt DESC
    `, [userId]);
    
    // For each order, get the order items
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await query(`
        SELECT 
          oi.orderItemID,
          oi.orderVarQty,
          oi.prodUPrice,
          pv.varSKU,
          p.prodTitle,
          p.prodDesc
        FROM 
          OrderItems oi
        JOIN 
          ProductVariants pv ON oi.varID = pv.varID
        JOIN 
          Product p ON pv.prodID = p.prodID
        WHERE 
          oi.orderID = ?
      `, [order.orderID]);
      
      return {
        ...order,
        items
      };
    }));
    
    res.json(ordersWithItems);
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ error: 'Failed to fetch user orders' });
  }
});

// Example 3: Get low stock inventory items that need attention
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    const lowStockItems = await query(`
      SELECT 
        i.invID,
        i.invQty,
        i.InvLowStockThreshold,
        pv.varID,
        pv.varSKU,
        p.prodID,
        p.prodTitle,
        (i.invQty <= i.InvLowStockThreshold) AS needsRestock
      FROM 
        Inventory i
      JOIN 
        ProductVariants pv ON i.varID = pv.varID
      JOIN 
        Product p ON pv.prodID = p.prodID
      WHERE 
        i.invQty <= i.InvLowStockThreshold
      ORDER BY 
        i.invQty ASC
    `);
    
    res.json(lowStockItems);
  } catch (error) {
    console.error('Error fetching low stock inventory:', error);
    res.status(500).json({ error: 'Failed to fetch low stock inventory' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});