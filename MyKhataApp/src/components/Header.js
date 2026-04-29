import React from 'react';

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <h1>MyKhataApp</h1>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default Header;
