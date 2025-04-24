import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import './OrderSummary.css';

const OrderSummary = () => {
  const { orderID } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/${orderID}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch order details.');
        }
        const data = await response.json();
        setOrder(data);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchOrder();
  }, [orderID]);

  if (error) return <div className="order-error">Error: {error}</div>;
  if (!order) return <div className="order-loading">Loading order summary...</div>;

  const formatCurrency = (amount) => {
    return `$${(parseFloat(amount) / 100).toFixed(2)}`;
  };

  return (
    <div className="order-summary-container">
      <div className="order-summary-card">
        <h1>Order Confirmed!</h1>
        <p className="order-id">Order ID: <strong>{order.orderID}</strong></p>
        <p className="order-status">Status: <span>{order.orderStat}</span></p>
        <p className="order-total">Total: {formatCurrency(order.totalAmount || order.orderTotalAmt)}</p>
        <p className="order-confirmation">Thank you for your purchase! Your order will be shipped soon!</p>
      </div>
    </div>
  );
};

export default OrderSummary;
