import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../style/InventoryList.css';

const InventoryList = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'low-stock'
  const [editingItem, setEditingItem] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  
  // Fetch inventory on component mount
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setLoading(true);
        
        const url = filter === 'low-stock' 
          ? '/api/inventory/low-stock' 
          : '/api/inventory';
          
        const response = await axios.get(url);
        setInventory(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setError('Failed to load inventory');
        setLoading(false);
      }
    };
    
    fetchInventory();
  }, [filter]);
  
  // Handle stock update
  const handleUpdateStock = async (invID) => {
    try {
      const quantity = parseInt(newQuantity);
      
      if (isNaN(quantity) || quantity < 0) {
        alert('Please enter a valid quantity');
        return;
      }
      
      await axios.put(`/api/inventory/${invID}`, { newQuantity: quantity });
      
      // Update local state
      setInventory(inventory.map(item => 
        item.invID === invID 
          ? { ...item, invQty: quantity, isLowStock: quantity <= item.InvLowStockThreshold } 
          : item
      ));
      
      // Reset editing state
      setEditingItem(null);
      setNewQuantity('');
    } catch (err) {
      console.error('Error updating inventory:', err);
      alert('Failed to update inventory');
    }
  };
  
  // Handle quick adjustment
  const handleQuickAdjust = async (invID, adjustment) => {
    try {
      const response = await axios.patch(`/api/inventory/${invID}/adjust`, { adjustment });
      
      // Update local state with returned updated item
      setInventory(inventory.map(item => 
        item.invID === invID ? response.data : item
      ));
    } catch (err) {
      console.error('Error adjusting inventory:', err);
      alert('Failed to adjust inventory');
    }
  };
  
  // Filter inventory based on search term
  const filteredInventory = inventory.filter(item => {
    return (
      item.prodTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.varSKU.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.varBCode && item.varBCode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });
  
  if (loading) {
    return (
      <div className="inventory-list-container">
        <div className="loading-indicator">Loading inventory data...</div>
      </div>
    );
  }
  
  return (
    <div className="inventory-list-container">
      <div className="list-header">
        <h2>Inventory Management</h2>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search products or SKUs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <div className="filter-group">
            <label>Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Items</option>
              <option value="low-stock">Low Stock Only</option>
            </select>
          </div>
        </div>
      </div>
      
      {filteredInventory.length === 0 ? (
        <div className="no-items-found">
          <p>No inventory items found matching your criteria.</p>
        </div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Quantity</th>
                <th>Low Stock Threshold</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item) => (
                <tr key={item.invID} className={item.isLowStock ? 'low-stock-row' : ''}>
                  <td>
                    <Link to={`/admin/products/edit/${item.prodID}`}>
                      {item.prodTitle}
                    </Link>
                  </td>
                  <td>{item.varSKU}</td>
                  <td>{item.varBCode || 'N/A'}</td>
                  <td>
                    {editingItem === item.invID ? (
                      <input
                        type="number"
                        min="0"
                        value={newQuantity}
                        onChange={(e) => setNewQuantity(e.target.value)}
                        className="quantity-input"
                      />
                    ) : (
                      <span className={item.isLowStock ? 'low-stock-qty' : ''}>
                        {item.invQty}
                      </span>
                    )}
                  </td>
                  <td>{item.InvLowStockThreshold}</td>
                  <td>
                    <span className={`status-badge ${item.isLowStock ? 'status-low' : 'status-ok'}`}>
                      {item.isLowStock ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    {editingItem === item.invID ? (
                      <>
                        <button 
                          onClick={() => handleUpdateStock(item.invID)}
                          className="save-button"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => {
                            setEditingItem(null);
                            setNewQuantity('');
                          }}
                          className="cancel-button"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={() => {
                            setEditingItem(item.invID);
                            setNewQuantity(item.invQty.toString());
                          }}
                          className="edit-button"
                        >
                          Edit
                        </button>
                        <div className="quick-adjust">
                          <button 
                            onClick={() => handleQuickAdjust(item.invID, -1)}
                            className="adjust-button"
                            disabled={item.invQty <= 0}
                          >
                            -
                          </button>
                          <button 
                            onClick={() => handleQuickAdjust(item.invID, 1)}
                            className="adjust-button"
                          >
                            +
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="back-to-dashboard">
        <Link to="/admin/dashboard">← Back to Dashboard</Link>
      </div>
    </div>
  );
};

export default InventoryList;