import React from 'react';

function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h2>Welcome to MyKhataApp</h2>
        <p>Manage your Khata with ease and efficiency</p>
      </section>

      <section className="features">
        <div className="feature">
          <h3>Track Transactions</h3>
          <p>Keep track of all your transactions in one place</p>
        </div>
        <div className="feature">
          <h3>Manage Records</h3>
          <p>Organize and manage your records efficiently</p>
        </div>
        <div className="feature">
          <h3>Generate Reports</h3>
          <p>Create detailed reports for better insights</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
