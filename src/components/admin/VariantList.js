import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../../style/VariantList.css';

const VariantList = () => {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const fetchVariants = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/variants');
        setVariants(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching variants:', err);
        setError('Failed to load variants');
        setLoading(false);
      }
    };
    
    fetchVariants();
  }, []);
  
  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this variant?')) {
      try {
        await axios.delete(`/api/variants/${id}`);
        setVariants(variants.filter(variant => variant.varID !== id));
      } catch (err) {
        console.error('Error deleting variant:', err);
        setError('Failed to delete variant');
      }
    }
  };
  
  const filteredVariants = variants.filter(variant => 
    variant.varSKU?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (variant.varBCode && variant.varBCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (variant.prodTitle && variant.prodTitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (loading) {
    return <div className="loading-indicator">Loading variants...</div>;
  }
  
  return (
    <div className="variant-list-container">
      <div className="list-header">
        <h2>Product Variants</h2>
        <Link to="/admin/variants/add" className="add-variant-button">
          Add New Variant
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="search-container">
        <input
          type="text"
          placeholder="Search variants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>
      
      <div className="back-to-dashboard">
        <Link to="/admin/dashboard">← Back to Dashboard</Link>
      </div>
      
      {filteredVariants.length === 0 ? (
        <div className="no-variants-found">
          <p>No variants found.</p>
        </div>
      ) : (
        <div className="variant-table-container">
          <table className="variant-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>SKU</th>
                <th>Barcode</th>
                <th>Product</th>
                <th>Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVariants.map((variant) => (
                <tr key={variant.varID}>
                  <td>{variant.varID}</td>
                  <td>{variant.varSKU}</td>
                  <td>{variant.varBCode || 'N/A'}</td>
                  <td>{variant.prodTitle || 'Unknown Product'}</td>
                  <td>${variant.varPrice || 'Unknow Price'}</td>
                  <td className="actions-cell">
                    <Link to={`/admin/variants/edit/${variant.varID}`} className="edit-button">
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(variant.varID)}
                      className="delete-button"
                    >
                      Delete
                    </button>
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

export default VariantList;