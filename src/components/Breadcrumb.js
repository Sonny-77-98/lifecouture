import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  let breadcrumbs = [];

  if (location.pathname !== '/') {
    breadcrumbs.push({ name: 'Home', path: '/' });
  }

  if (pathnames[0] === 'order-summary') {
    breadcrumbs.push({ name: 'Order Summary', path: '/order-summary' });
  } else {
    pathnames.forEach((path, index) => {
      let name = path.charAt(0).toUpperCase() + path.slice(1);

      if (path === 'checkout') {
        breadcrumbs.push({ name: 'Cart', path: '/cart' });
        breadcrumbs.push({ name: 'Checkout', path: '/checkout' });
      }
      else if (path !== 'cart') {
        breadcrumbs.push({
          name,
          path: `/${pathnames.slice(0, index + 1).join('/')}`,
        });
      }
    });
  }

  return (
    <div className="breadcrumb-container">
      <nav>
        <ul className="breadcrumb-list">
          {breadcrumbs.map((crumb, index) => (
            <li key={crumb.path}>
              <Link to={crumb.path}>{crumb.name}</Link>
              {index < breadcrumbs.length - 1 && ' > '}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Breadcrumb;
