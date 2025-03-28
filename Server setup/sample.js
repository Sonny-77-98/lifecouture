// sample-data.js
require('dotenv').config();
const { query } = require('./config/db');

async function insertSampleData() {
  try {
    console.log('Starting sample data insertion...');
    
    // Clear existing data (optional - comment out if you don't want to clear your tables)
    await clearExistingData();
    
    // Insert Categories
    const categoryIds = await insertCategories();
    console.log('Categories inserted successfully');
    
    // Insert Products
    const productIds = await insertProducts(categoryIds);
    console.log('Products inserted successfully');
    
    // Insert Product Attributes
    const attributeIds = await insertProductAttributes();
    console.log('Product attributes inserted successfully');
    
    // Insert Product Variants
    const variantIds = await insertProductVariants(productIds, attributeIds);
    console.log('Product variants inserted successfully');
    
    // Insert User Addresses and Users
    const { addressIds, userIds } = await insertUsersAndAddresses();
    console.log('Users and addresses inserted successfully');
    
    // Add items to shopping carts
    await addItemsToCart(userIds, variantIds);
    console.log('Items added to shopping carts successfully');
    
    // Create some orders
    await createSampleOrders(userIds, variantIds);
    console.log('Sample orders created successfully');
    
    console.log('Sample data insertion completed successfully');
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

async function clearExistingData() {
  try {
    // Disable foreign key checks to allow table truncation
    await query('SET FOREIGN_KEY_CHECKS = 0');
    
    // Tables to truncate in appropriate order
    const tables = [
      'OrderItems', 'Orders', 'CartItems', 'ShoppingCart',
      'Inventory', 'VariantAttributesValues', 'ProductVariants',
      'ProductAttributes', 'ProductImages', 'Vendor',
      'ProductCategories', 'Product', 'Categories',
      'User', 'UserAddresses'
    ];
    
    // Truncate each table
    for (const table of tables) {
      await query(`TRUNCATE TABLE ${table}`);
      console.log(`Table ${table} truncated successfully`);
    }
    
    // Re-enable foreign key checks
    await query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('Existing data cleared successfully');
  } catch (error) {
    console.error('Error clearing existing data:', error);
    throw error;
  }
}

async function insertCategories() {
  try {
    const categories = [
      {
        name: 'T-Shirts',
        description: 'Comfortable and stylish T-shirts for everyday wear',
        status: 'active',
        seo: 'life-couture-tshirts-streetwear-comfortable-stylish'
      },
      {
        name: 'Joggers',
        description: 'Premium quality joggers for style and comfort',
        status: 'active',
        seo: 'life-couture-joggers-streetwear-premium-comfortable'
      },
      {
        name: 'Shorts',
        description: 'Stylish shorts for casual and athletic wear',
        status: 'active',
        seo: 'life-couture-shorts-streetwear-casual-athletic'
      },
      {
        name: 'Beanies',
        description: 'Trendy beanies to complete your streetwear look',
        status: 'active',
        seo: 'life-couture-beanies-streetwear-trendy-fashionable'
      },
      {
        name: 'Socks',
        description: 'Colorful and comfortable socks for everyday wear',
        status: 'active',
        seo: 'life-couture-socks-streetwear-colorful-comfortable'
      }
    ];
    
    const categoryIds = [];
    
    for (const category of categories) {
      const result = await query(
        'INSERT INTO Categories (catName, catDes, catStat, catSEO) VALUES (?, ?, ?, ?)',
        [category.name, category.description, category.status, category.seo]
      );
      
      categoryIds.push(result.insertId);
    }
    
    return categoryIds;
  } catch (error) {
    console.error('Error inserting categories:', error);
    throw error;
  }
}

async function insertProducts(categoryIds) {
  try {
    const products = [
      {
        title: 'Essential Logo Tee',
        description: 'Classic cotton T-shirt with the Life Couture logo. Perfect for everyday wear with a relaxed fit and premium feel.',
        url: 'essential-logo-tee',
        status: 'active',
        categories: [categoryIds[0]] // T-Shirts category
      },
      {
        title: 'Urban Comfort Joggers',
        description: 'Premium cotton-blend joggers designed for all-day comfort. Features elastic waistband with drawstring and tapered fit.',
        url: 'urban-comfort-joggers',
        status: 'active',
        categories: [categoryIds[1]] // Joggers category
      },
      {
        title: 'Street Flow Shorts',
        description: 'Versatile shorts for any casual occasion. Made with breathable fabric and featuring side pockets and an adjustable waistband.',
        url: 'street-flow-shorts',
        status: 'active',
        categories: [categoryIds[2]] // Shorts category
      },
      {
        title: 'City Vibe Beanie',
        description: 'Stay warm and stylish with our signature beanie. Made with soft, stretchable material for the perfect fit.',
        url: 'city-vibe-beanie',
        status: 'active',
        categories: [categoryIds[3]] // Beanies category
      },
      {
        title: 'Everyday Pattern Socks',
        description: 'Add a pop of color to your outfit with our comfortable patterned socks. Made with breathable cotton blend for all-day comfort.',
        url: 'everyday-pattern-socks',
        status: 'active',
        categories: [categoryIds[4]] // Socks category
      },
      {
        title: 'Graphic Print Tee',
        description: 'Express your style with our unique graphic print T-shirt. Features a relaxed fit and premium cotton fabric.',
        url: 'graphic-print-tee',
        status: 'active',
        categories: [categoryIds[0]] // T-Shirts category
      },
      {
        title: 'Premium Tech Joggers',
        description: 'Advanced technical joggers with moisture-wicking fabric and modern fit. Perfect for active lifestyles.',
        url: 'premium-tech-joggers',
        status: 'active',
        categories: [categoryIds[1]] // Joggers category
      }
    ];
    
    const productIds = [];
    
    for (const product of products) {
      // Insert product
      const result = await query(
        'INSERT INTO Product (prodTitle, prodDesc, prodURL, prodStat) VALUES (?, ?, ?, ?)',
        [product.title, product.description, product.url, product.status]
      );
      
      const productId = result.insertId;
      productIds.push(productId);
      
      // Insert product categories
      for (const categoryId of product.categories) {
        await query(
          'INSERT INTO ProductCategories (prodID, catID) VALUES (?, ?)',
          [productId, categoryId]
        );
      }
      
      // Insert product images (2 images per product)
      await query(
        'INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID) VALUES (?, ?, ?, ?, ?)',
        [`/images/${product.url}-1.jpg`, `${product.title} front view`, 800, 1200, productId]
      );
      
      await query(
        'INSERT INTO ProductImages (imgURL, imgAlt, imgWidth, imgHeight, prodID) VALUES (?, ?, ?, ?, ?)',
        [`/images/${product.url}-2.jpg`, `${product.title} back view`, 800, 1200, productId]
      );
    }
    
    return productIds;
  } catch (error) {
    console.error('Error inserting products:', error);
    throw error;
  }
}

async function insertProductAttributes() {
  try {
    const attributes = [
      { name: 'Size', type: 'string' },
      { name: 'Color', type: 'string' },
      { name: 'Material', type: 'string' }
    ];
    
    const attributeIds = [];
    
    for (const attribute of attributes) {
      const result = await query(
        'INSERT INTO ProductAttributes (attName, attType) VALUES (?, ?)',
        [attribute.name, attribute.type]
      );
      
      attributeIds.push(result.insertId);
    }
    
    return attributeIds;
  } catch (error) {
    console.error('Error inserting product attributes:', error);
    throw error;
  }
}

async function insertProductVariants(productIds, attributeIds) {
  try {
    // Sample variant data for each product
    const variantData = [
      // For Essential Logo Tee (productIds[0])
      [
        { sku: 'ELT-S-BLK', barcode: '1000000001', size: 'S', color: 'Black', qty: 25 },
        { sku: 'ELT-M-BLK', barcode: '1000000002', size: 'M', color: 'Black', qty: 30 },
        { sku: 'ELT-L-BLK', barcode: '1000000003', size: 'L', color: 'Black', qty: 35 },
        { sku: 'ELT-S-WHT', barcode: '1000000004', size: 'S', color: 'White', qty: 25 },
        { sku: 'ELT-M-WHT', barcode: '1000000005', size: 'M', color: 'White', qty: 30 },
        { sku: 'ELT-L-WHT', barcode: '1000000006', size: 'L', color: 'White', qty: 35 }
      ],
      // For Urban Comfort Joggers (productIds[1])
      [
        { sku: 'UCJ-S-GRY', barcode: '1000000007', size: 'S', color: 'Grey', qty: 20 },
        { sku: 'UCJ-M-GRY', barcode: '1000000008', size: 'M', color: 'Grey', qty: 25 },
        { sku: 'UCJ-L-GRY', barcode: '1000000009', size: 'L', color: 'Grey', qty: 30 },
        { sku: 'UCJ-S-BLK', barcode: '1000000010', size: 'S', color: 'Black', qty: 20 },
        { sku: 'UCJ-M-BLK', barcode: '1000000011', size: 'M', color: 'Black', qty: 25 },
        { sku: 'UCJ-L-BLK', barcode: '1000000012', size: 'L', color: 'Black', qty: 30 }
      ],
      // For Street Flow Shorts (productIds[2])
      [
        { sku: 'SFS-S-BLK', barcode: '1000000013', size: 'S', color: 'Black', qty: 15 },
        { sku: 'SFS-M-BLK', barcode: '1000000014', size: 'M', color: 'Black', qty: 20 },
        { sku: 'SFS-L-BLK', barcode: '1000000015', size: 'L', color: 'Black', qty: 25 },
        { sku: 'SFS-S-BLU', barcode: '1000000016', size: 'S', color: 'Blue', qty: 15 },
        { sku: 'SFS-M-BLU', barcode: '1000000017', size: 'M', color: 'Blue', qty: 20 },
        { sku: 'SFS-L-BLU', barcode: '1000000018', size: 'L', color: 'Blue', qty: 25 }
      ],
      // For City Vibe Beanie (productIds[3])
      [
        { sku: 'CVB-ONE-BLK', barcode: '1000000019', size: 'One Size', color: 'Black', qty: 40 },
        { sku: 'CVB-ONE-GRY', barcode: '1000000020', size: 'One Size', color: 'Grey', qty: 35 },
        { sku: 'CVB-ONE-RED', barcode: '1000000021', size: 'One Size', color: 'Red', qty: 30 }
      ],
      // For Everyday Pattern Socks (productIds[4])
      [
        { sku: 'EPS-S-MIX1', barcode: '1000000022', size: 'S', color: 'Pattern Mix 1', qty: 50 },
        { sku: 'EPS-M-MIX1', barcode: '1000000023', size: 'M', color: 'Pattern Mix 1', qty: 60 },
        { sku: 'EPS-L-MIX1', barcode: '1000000024', size: 'L', color: 'Pattern Mix 1', qty: 45 },
        { sku: 'EPS-S-MIX2', barcode: '1000000025', size: 'S', color: 'Pattern Mix 2', qty: 40 },
        { sku: 'EPS-M-MIX2', barcode: '1000000026', size: 'M', color: 'Pattern Mix 2', qty: 55 },
        { sku: 'EPS-L-MIX2', barcode: '1000000027', size: 'L', color: 'Pattern Mix 2', qty: 35 }
      ],
      // For Graphic Print Tee (productIds[5])
      [
        { sku: 'GPT-S-BLK', barcode: '1000000028', size: 'S', color: 'Black', qty: 25 },
        { sku: 'GPT-M-BLK', barcode: '1000000029', size: 'M', color: 'Black', qty: 30 },
        { sku: 'GPT-L-BLK', barcode: '1000000030', size: 'L', color: 'Black', qty: 25 },
        { sku: 'GPT-S-WHT', barcode: '1000000031', size: 'S', color: 'White', qty: 25 },
        { sku: 'GPT-M-WHT', barcode: '1000000032', size: 'M', color: 'White', qty: 30 },
        { sku: 'GPT-L-WHT', barcode: '1000000033', size: 'L', color: 'White', qty: 25 }
      ],
      // For Premium Tech Joggers (productIds[6])
      [
        { sku: 'PTJ-S-BLK', barcode: '1000000034', size: 'S', color: 'Black', qty: 20 },
        { sku: 'PTJ-M-BLK', barcode: '1000000035', size: 'M', color: 'Black', qty: 25 },
        { sku: 'PTJ-L-BLK', barcode: '1000000036', size: 'L', color: 'Black', qty: 20 },
        { sku: 'PTJ-S-NVY', barcode: '1000000037', size: 'S', color: 'Navy', qty: 15 },
        { sku: 'PTJ-M-NVY', barcode: '1000000038', size: 'M', color: 'Navy', qty: 20 },
        { sku: 'PTJ-L-NVY', barcode: '1000000039', size: 'L', color: 'Navy', qty: 15 }
      ]
    ];
    
    const variantIds = [];
    
    // Map attribute IDs for easier reference
    const sizeAttributeId = attributeIds[0];
    const colorAttributeId = attributeIds[1];
    
    // Insert variants for each product
    for (let i = 0; i < productIds.length && i < variantData.length; i++) {
      const productId = productIds[i];
      const variants = variantData[i];
      
      for (const variant of variants) {
        // Insert product variant
        const result = await query(
          'INSERT INTO ProductVariants (varSKU, varBCode, prodID) VALUES (?, ?, ?)',
          [variant.sku, variant.barcode, productId]
        );
        
        const variantId = result.insertId;
        variantIds.push(variantId);
        
        // Insert variant attributes (size and color)
        await query(
          'INSERT INTO VariantAttributesValues (varID, attID, attValue) VALUES (?, ?, ?)',
          [variantId, sizeAttributeId, variant.size]
        );
        
        await query(
          'INSERT INTO VariantAttributesValues (varID, attID, attValue) VALUES (?, ?, ?)',
          [variantId, colorAttributeId, variant.color]
        );
        
        // Insert inventory for this variant
        await query(
          'INSERT INTO Inventory (invQty, InvLowStockThreshold, varID) VALUES (?, ?, ?)',
          [variant.qty, 5, variantId]
        );
      }
    }
    
    return variantIds;
  } catch (error) {
    console.error('Error inserting product variants:', error);
    throw error;
  }
}

async function insertUsersAndAddresses() {
  try {
    const addresses = [
      {
        type: 'shipping',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postalCode: 10001,
        country: 'USA',
        isDefault: true
      },
      {
        type: 'shipping',
        street: '456 Oak Ave',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: 90001,
        country: 'USA',
        isDefault: true
      },
      {
        type: 'shipping',
        street: '789 Pine St',
        city: 'Chicago',
        state: 'IL',
        postalCode: 60601,
        country: 'USA',
        isDefault: true
      },
      {
        type: 'shipping',
        street: '101 Maple Rd',
        city: 'Boston',
        state: 'MA',
        postalCode: 02108,
        country: 'USA',
        isDefault: true
      },
      {
        type: 'shipping',
        street: '202 Cedar Ln',
        city: 'Miami',
        state: 'FL',
        postalCode: 33101,
        country: 'USA',
        isDefault: true
      }
    ];
    
    const users = [
      {
        firstName: 'John',
        lastName: 'Doe',
        description: 'Regular customer since 2022',
        password: 'hashed_password_1', // In a real application, use a proper hashing function
        role: 'customer',
        phoneNumber: '123-456-7890',
        email: 'john.doe@example.com'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        description: 'VIP customer',
        password: 'hashed_password_2',
        role: 'customer',
        phoneNumber: '234-567-8901',
        email: 'jane.smith@example.com'
      },
      {
        firstName: 'Robert',
        lastName: 'Johnson',
        description: 'New customer',
        password: 'hashed_password_3',
        role: 'customer',
        phoneNumber: '345-678-9012',
        email: 'robert.johnson@example.com'
      },
      {
        firstName: 'Emily',
        lastName: 'Williams',
        description: 'Regular customer',
        password: 'hashed_password_4',
        role: 'customer',
        phoneNumber: '456-789-0123',
        email: 'emily.williams@example.com'
      },
      {
        firstName: 'Admin',
        lastName: 'User',
        description: 'Store administrator',
        password: 'admin_password',
        role: 'admin',
        phoneNumber: '567-890-1234',
        email: 'admin@lifecouture.net'
      }
    ];
    
    const addressIds = [];
    const userIds = [];
    
    // Insert addresses
    for (const address of addresses) {
      const result = await query(
        'INSERT INTO UserAddresses (usAdType, usAdStr, usAdCity, usAdState, usAdPCode, usAdCountry, usAdIsDefault) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          address.type,
          address.street,
          address.city,
          address.state,
          address.postalCode,
          address.country,
          address.isDefault
        ]
      );
      
      addressIds.push(result.insertId);
    }
    
    // Insert users with addresses
    for (let i = 0; i < users.length && i < addressIds.length; i++) {
      const user = users[i];
      const addressId = addressIds[i];
      
      const result = await query(
        'INSERT INTO User (usFname, usLname, usDesc, usPassword, usRole, usPNum, usEmail, usAdID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          user.firstName,
          user.lastName,
          user.description,
          user.password,
          user.role,
          user.phoneNumber,
          user.email,
          addressId
        ]
      );
      
      userIds.push(result.insertId);
    }
    
    return { addressIds, userIds };
  } catch (error) {
    console.error('Error inserting users and addresses:', error);
    throw error;
  }
}

async function addItemsToCart(userIds, variantIds) {
  try {
    // Add items to the first 3 users' carts
    for (let i = 0; i < 3 && i < userIds.length; i++) {
      const userId = userIds[i];
      
      // Each user gets 2-3 items in their cart
      const numItems = Math.floor(Math.random() * 2) + 2; // 2 or 3
      
      for (let j = 0; j < numItems; j++) {
        // Choose a random variant
        const randomIndex = Math.floor(Math.random() * variantIds.length);
        const variantId = variantIds[randomIndex];
        
        // Random quantity between 1 and 3
        const quantity = Math.floor(Math.random() * 3) + 1;
        
        // Use the stored procedure to add the item to the cart
        await query(
          'CALL AddItemToCart(?, ?, ?)',
          [userId, variantId, quantity]
        );
      }
    }
  } catch (error) {
    console.error('Error adding items to cart:', error);
    throw error;
  }
}

async function createSampleOrders(userIds, variantIds) {
  try {
    const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered'];
    
    // Create 1-2 orders for each user
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const numOrders = Math.floor(Math.random() * 2) + 1; // 1 or 2
      
      for (let j = 0; j < numOrders; j++) {
        // Random order status
        const statusIndex = Math.floor(Math.random() * orderStatuses.length);
        const orderStatus = orderStatuses[statusIndex];
        
        // Random order total (between $20 and $200)
        const orderTotal = Math.floor(Math.random() * 18000) + 2000; // 2000 to 20000 cents ($20 to $200)
        
        // Create order
        const orderResult = await query(
          'INSERT INTO Orders (orderStat, orderTotalAmt, orderCreatedAt, orderUpdatedAt, userID) VALUES (?, ?, NOW(), NOW(), ?)',
          [orderStatus, orderTotal, userId]
        );
        
        const orderId = orderResult.insertId;
        
        // Add 1-4 items to the order
        const numItems = Math.floor(Math.random() * 4) + 1;
        let remainingTotal = orderTotal;
        
        for (let k = 0; k < numItems; k++) {
          // Choose a random variant
          const randomIndex = Math.floor(Math.random() * variantIds.length);
          const variantId = variantIds[randomIndex];
          
          // Random quantity between 1 and 3
          const quantity = Math.floor(Math.random() * 3) + 1;
          
          // Calculate price for this item (ensuring the sum matches the order total)
          let unitPrice;
          if (k === numItems - 1) {
            // Last item - use remaining total
            unitPrice = Math.floor(remainingTotal / quantity);
          } else {
            // Random price between $10 and $50
            unitPrice = Math.floor(Math.random() * 4000) + 1000; // 1000 to 5000 cents ($10 to $50)
            remainingTotal -= unitPrice * quantity;
          }
          
          // Add order item
          await query(
            'INSERT INTO OrderItems (orderVarQty, prodUPrice, orderID, varID) VALUES (?, ?, ?, ?)',
            [quantity, unitPrice, orderId, variantId]
          );
        }
      }
    }
  } catch (error) {
    console.error('Error creating sample orders:', error);
    throw error;
  }
}

// Run the function to insert sample data
insertSampleData().then(() => {
  console.log('Script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});