import axios from 'axios';

const createAuthAxios = () => {
  const token = localStorage.getItem('token');
  
  const instance = axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      'x-auth-token': token || ''
    }
  });
  
  instance.interceptors.response.use(
    response => response,
    error => {
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.log('Authentication error detected in API call');
      }
      return Promise.reject(error);
    }
  );
  
  return instance;
};

export default createAuthAxios;