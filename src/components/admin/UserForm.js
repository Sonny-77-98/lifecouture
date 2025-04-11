import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import '../../style/UserForm.css';

const UserForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const { isAuthenticated } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    firstName: '', 
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'customer',
    description: '',
    password: '',
    confirmPassword: '',
    address: {
      type: 'shipping',
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'USA',
      isDefault: true
    }
  });
  
  const [loading, setLoading] = useState(isEditMode);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(false);
  const roleOptions = [
    'customer',
    'admin'
  ];
  
  const stateOptions = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];
  
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  useEffect(() => {
    const fetchUser = async () => {
      if (!isEditMode) return;
      
      try {
        setLoading(true);
        
        const token = getAuthToken();
        if (!token) {
          setAuthError(true);
          setLoading(false);
          return;
        }
        
        const userResponse = await axios.get(`/api/users/${id}`, {
          headers: { 'x-auth-token': token }
        });
        
        const userData = userResponse.data;
        console.log('User data loaded:', userData);
        
        try {
          const addressResponse = await axios.get(`/api/users/${id}/addresses`, {
            headers: { 'x-auth-token': token }
          });
          
          const addressData = Array.isArray(addressResponse.data) && addressResponse.data.length > 0 
            ? addressResponse.data[0] 
            : null;
          
          console.log('Address data loaded:', addressData);
          
          setFormData({
            firstName: userData.usFname || '',
            lastName: userData.usLname || '',
            email: userData.usEmail || '',
            phoneNumber: userData.usPNum || '',
            role: userData.usRole || 'customer',
            description: userData.usDesc || '',
            password: '',
            confirmPassword: '',
            address: addressData ? {
              type: addressData.usAdType || 'shipping',
              street: addressData.usAdStr || '',
              city: addressData.usAdCity || '',
              state: addressData.usAdState || '',
              postalCode: addressData.usAdPCode || '',
              country: addressData.usAdCountry || 'USA',
              isDefault: addressData.usAdIsDefault || true
            } : {
              type: 'shipping',
              street: '',
              city: '',
              state: '',
              postalCode: '',
              country: 'USA',
              isDefault: true
            }
          });
        } catch (addressErr) {
          console.error('Error fetching address:', addressErr);

          setFormData({
            firstName: userData.usFname || '',
            lastName: userData.usLname || '',
            email: userData.usEmail || '',
            phoneNumber: userData.usPNum || '',
            role: userData.usRole || 'customer',
            description: userData.usDesc || '',
            password: '',
            confirmPassword: '',
            address: {
              type: 'shipping',
              street: '',
              city: '',
              state: '',
              postalCode: '',
              country: 'USA',
              isDefault: true
            }
          });
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching user data:', err);
        
        if (err.response?.status === 401 || err.response?.status === 403) {
          setAuthError(true);
        } else {
          setError('Failed to load user information');
        }
        
        setLoading(false);
      }
    };
    
    if (isAuthenticated) {
      fetchUser();
    }
  }, [id, isEditMode, isAuthenticated]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddressChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: finalValue
      }
    }));
  };
  
  const validateForm = () => {
    // Basic validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      return false;
    }
    
    if (!formData.lastName.trim()) {
      setError('Last name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    
    if (!formData.phoneNumber.trim()) {
      setError('Phone number is required');
      return false;
    }
    
    if (!isEditMode && !formData.password) {
      setError('Password is required for new users');
      return false;
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    // Address validation
    if (!formData.address.street.trim()) {
      setError('Street address is required');
      return false;
    }
    
    if (!formData.address.city.trim()) {
      setError('City is required');
      return false;
    }
    
    if (!formData.address.state.trim()) {
      setError('State is required');
      return false;
    }
    
    if (!formData.address.postalCode.trim()) {
      setError('Postal code is required');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        setAuthError(true);
        setSubmitting(false);
        return;
      }
      
      const userData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        description: formData.description,
        address: {
          type: formData.address.type,
          street: formData.address.street,
          city: formData.address.city,
          state: formData.address.state,
          postalCode: formData.address.postalCode,
          country: formData.address.country,
          isDefault: formData.address.isDefault
        }
      };
      if (formData.password) {
        userData.password = formData.password;
      }
      
      let response;
      
      if (isEditMode) {
        response = await axios.put(`/api/users/${id}`, userData, {
          headers: { 'x-auth-token': token }
        });
        
        setSuccess('User updated successfully');
      } else {
        response = await axios.post('/api/users', userData, {
          headers: { 'x-auth-token': token }
        });
        
        setSuccess('User created successfully');
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phoneNumber: '',
          role: 'customer',
          description: '',
          password: '',
          confirmPassword: '',
          address: {
            type: 'shipping',
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: 'USA',
            isDefault: true
          }
        });
      }
      
      // Redirect to user list after a brief delay
      setTimeout(() => {
        navigate('/admin/users');
      }, 2000);
      
    } catch (err) {
      console.error('Error saving user:', err);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setAuthError(true);
      } else if (err.response?.status === 400 && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to save user. Please try again.');
      }
      
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="user-form-container">
        <div className="loading-indicator">Loading user data...</div>
      </div>
    );
  }
  
  if (authError) {
    return (
      <div className="user-form-container">
        <div className="form-header">
          <h2>{isEditMode ? 'Edit User' : 'Add New User'}</h2>
          <Link to="/admin/users" className="back-link">
            &larr; Back to Users
          </Link>
        </div>
        
        <div className="auth-error-message">
          <p>Admin access required for this action. Please log in with an admin account.</p>
          <Link to="/login" className="login-link">Log In</Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="user-form-container">
      <div className="form-header">
        <h2>{isEditMode ? 'Edit User' : 'Add New User'}</h2>
        <Link to="/admin/users" className="back-link">
          &larr; Back to Users
        </Link>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="user-form">
        <div className="form-grid">
          <div className="user-details">
            <h3>User Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name*</label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="Enter first name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="lastName">Last Name*</label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Email*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number*</label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="role">Role*</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                >
                  {roleOptions.map(role => (
                    <option key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Brief description (optional)"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">{isEditMode ? 'New Password (leave blank to keep current)' : 'Password*'}</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={isEditMode ? "Enter new password (optional)" : "Enter password"}
                  required={!isEditMode}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  required={!!formData.password}
                />
              </div>
            </div>
          </div>
          
          <div className="address-details">
            <h3>Primary Address</h3>
            
            <div className="form-group">
              <label htmlFor="address-type">Address Type*</label>
              <select
                id="address-type"
                name="type"
                value={formData.address.type}
                onChange={handleAddressChange}
                required
              >
                <option value="shipping">Shipping</option>
                <option value="billing">Billing</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="street">Street Address*</label>
              <input
                type="text"
                id="street"
                name="street"
                value={formData.address.street}
                onChange={handleAddressChange}
                placeholder="Enter street address"
                required
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="city">City*</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.address.city}
                  onChange={handleAddressChange}
                  placeholder="Enter city"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="state">State*</label>
                <select
                  id="state"
                  name="state"
                  value={formData.address.state}
                  onChange={handleAddressChange}
                  required
                >
                  <option value="">Select State</option>
                  {stateOptions.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="postalCode">Postal Code*</label>
                <input
                  type="text"
                  id="postalCode"
                  name="postalCode"
                  value={formData.address.postalCode}
                  onChange={handleAddressChange}
                  placeholder="Enter postal code"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="country">Country*</label>
                <input
                  type="text"
                  id="country"
                  name="country"
                  value={formData.address.country}
                  onChange={handleAddressChange}
                  placeholder="Enter country"
                  required
                />
              </div>
            </div>
            
            <div className="form-group checkbox-group">
              <input
                type="checkbox"
                id="isDefault"
                name="isDefault"
                checked={formData.address.isDefault}
                onChange={handleAddressChange}
              />
              <label htmlFor="isDefault">Set as default address</label>
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="submit"
            className="submit-button"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEditMode ? 'Update User' : 'Create User'}
          </button>
          
          <button
            type="button"
            className="cancel-button"
            onClick={() => navigate('/admin/users')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;