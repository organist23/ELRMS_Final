import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Leaves from './pages/Leaves';
import History from './pages/Ledger';
import Login from './pages/Login';
import LeaveCardReport from './pages/LeaveCardReport';

import { NotificationProvider } from './context/NotificationContext';

const App = () => {
  const [user, setUser] = React.useState(JSON.parse(localStorage.getItem('admin_user')));

  const handleLogin = (userData) => {
    localStorage.setItem('admin_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_user');
    setUser(null);
  };

  return (
    <NotificationProvider>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          
          <Route element={user ? <Layout onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/leaves" element={<Leaves />} />
            <Route path="/history" element={<History />} />
            <Route path="/employees/:id/leave-card" element={<LeaveCardReport />} />
          </Route>
        </Routes>
      </Router>
    </NotificationProvider>
  );
};

export default App;
