import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../../style/UserAddresses.css';

const UserAddresses = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [addresses, setAddresses] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newAddress, setNewAddress] = useState({
    type: 'shipping',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'USA',
    isDefault: false
  });
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  useEffect(() => {
    const fetchUserAndAddresses = async () => {
      try {
        setLoading(true);
        
        const token = getAuthToken();
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const userResponse = await axios.get(`/api/users/${id}`, {
          headers: { 'x-auth-token': token }
        });
        setUser(userResponse.data);

        const addressResponse = await axios.get(`/api/users/${id}/addresses`, {
          headers: { 'x-auth-token': token }
        });
        
        if (Array.isArray(addressResponse.data)) {
          setAddresses(addressResponse.data);
        } else {
          setAddresses(addressResponse.data ? [addressResponse.data] : []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError('Failed to load user addresses');
        setLoading(false);
      }
    };
    
    fetchUserAndAddresses();
  }, [id]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      const response = await axios.post(`/api/users/${id}/addresses`, newAddress, {
        headers: { 'x-auth-token': token }
      });

      const addressResponse = await axios.get(`/api/users/${id}/addresses`, {
        headers: { 'x-auth-token': token }
      });
      
      if (Array.isArray(addressResponse.data)) {
        setAddresses(addressResponse.data);
      } else {
        setAddresses(addressResponse.data ? [addressResponse.data] : []);
      }

      setNewAddress({
        type: 'shipping',
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'USA',
        isDefault: false
      });
      
      setShowAddForm(false);
    } catch (err) {
      console.error('Error adding address:', err);
      setError('Failed to add address');
    }
  };
  
  const handleSetDefault = async (addressId) => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      
      await axios.patch(`/api/users/${id}/addresses/${addressId}/default`, {}, {
        headers: { 'x-auth-token': token }
      });

      setAddresses(addresses.map(addr => ({
        ...addr,
        usAdIsDefault: addr.usAdID === addressId
      })));
      
    } catch (err) {
      console.error('Error setting default address:', err);
      setError('Failed to set default address');
    }
  };
  
  const handleDeleteAddress = async (addressId) => {
    if (window.confirm('Are you sure you want to delete this address?')) {
      try {
        const token = getAuthToken();
        if (!token) {
          setError('Authentication required');
          return;
        }
        
        await axios.delete(`/api/users/${id}/addresses/${addressId}`, {
          headers: { 'x-auth-token': token }
        });
        setAddresses(addresses.filter(addr => addr.usAdID !== addressId));
        
      } catch (err) {
        console.error('Error deleting address:', err);
        setError('Failed to delete address');
      }
    }
  };
  
  if (loading) {
    return <div className="loading-indicator">Loading addresses...</div>;
  }
  
  return (
    <div className="user-addresses-container">
      <div className="addresses-header">
        <h2>Addresses for {user ? `${user.usFname} ${user.usLname}` : 'User'}</h2>
        <Link to="/admin/users" className="back-link">← Back to Users</Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      <button 
        className="add-address-button"
        onClick={() => setShowAddForm(!showAddForm)}
      >
        {showAddForm ? 'Cancel' : 'Add New Address'}
      </button>
      
      {showAddForm && (
        <div className="address-form-container">
          <h3>Add New Address</h3>
          <form onSubmit={handleAddAddress} className="address-form">
            <div className="form-group">
              <label htmlFor="type">Address Type:</label>
              <select
                id="type"
                name="type"
                value={newAddress.type}
                onChange={handleInputChange}
                required
              >
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="street">Street Address:</label>
              <input
                type="text"
                id="street"
                name="street"
                value={newAddress.street}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City:</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={newAddress.city}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="state">State:</label>
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={newAddress.state}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="postalCode">Postal Code:</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={newAddress.postalCode}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="country">Country:</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={newAddress.country}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="form-group checkbox-group">
              <label htmlFor="isDefault">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={newAddress.isDefault}
                  onChange={handleCheckboxChange}
                />
                Set as default address
              </label>
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-button">Add Address</button>
              <button 
                type="button" 
                className="cancel-button"
                onClick={() => setShowAddForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      <div className="addresses-list">
        {addresses.length === 0 ? (
          <p className="no-addresses">No addresses found for this user.</p>
        ) : (
          addresses.map(address => (
            <div key={address.usAdID} className="address-card">
              <div className="address-type">
                {address.usAdType.charAt(0).toUpperCase() + address.usAdType.slice(1)} Address
                {address.usAdIsDefault && <span className="default-badge">Default</span>}
              </div>
              
              <div className="address-content">
                <p>{address.usAdStr}</p>
                <p>{address.usAdCity}, {address.usAdState} {address.usAdPCode}</p>
                <p>{address.usAdCountry}</p>
              </div>
              
              <div className="address-actions">
                {!address.usAdIsDefault && (
                  <button 
                    onClick={() => handleSetDefault(address.usAdID)}
                    className="default-button"
                  >
                    Set as Default
                  </button>
                )}
                <button 
                  onClick={() => handleDeleteAddress(address.usAdID)}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserAddresses;