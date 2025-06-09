import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <p>&copy; {currentYear} <a href='https://tsusu0409.com' target='_blank'>Tsubasa KAWAGISHI</a>. All Rights Reserved.</p>
    </footer>
  );
};

export default Footer;