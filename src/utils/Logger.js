export const log = (...args) => {
    if (process.env.NODE_ENV !== 'production' || !process.env.REACT_APP_DISABLE_CONSOLE) {
      console.log(...args);
    }
  };
  
  export const error = (...args) => {
    if (process.env.NODE_ENV !== 'production' || !process.env.REACT_APP_DISABLE_CONSOLE) {
      console.error(...args);
    }
  };
  
  export const warn = (...args) => {
    if (process.env.NODE_ENV !== 'production' || !process.env.REACT_APP_DISABLE_CONSOLE) {
      console.warn(...args);
    }
  };