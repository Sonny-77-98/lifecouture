const express = require('express');
const router = express.Router();
const { Order } = require('../models');  // Adjust the path based on your models directory

// POST request to handle placing an order
router.post('/api/checkout', async (req, res) => {
  const { userID, items, totalAmount, name, email, phone, address } = req.body;

  if (!userID || !items || items.length === 0 || !totalAmount || !name || !email || !phone || !address) {
    return res.status(400).json({ error: 'Invalid order data' });
  }

  try {
    // Create the order in the database (using an ORM like Sequelize or Mongoose)
    const order = await Order.create({
      userId: userID, // Assuming you have a user table and you're using the user's ID
      items: items,   // Store items (can be serialized as JSON)
      totalAmount: totalAmount,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      shippingAddress: address,
      status: 'pending', // Set the order status (optional)
    });

    res.status(200).json(order);  // Send the created order back as a response
  } catch (error) {
    console.error('Error placing order:', error);
    res.status(500).json({ error: 'Error placing order' });
  }
});

module.exports = router;
