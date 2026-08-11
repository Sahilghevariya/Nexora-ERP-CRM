import React from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { Role } from '../../context/AuthContext';
import { DashboardIcon, UsersIcon, InventoryIcon, LedgerIcon, ChallanIcon } from '../Icons';

export const DashboardShell: React.FC = () => {
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    {
      label: 'Overview',
      path: '/dashboard',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'] as Role[],
      icon: <DashboardIcon size={18} />,
    },
    {
      label: 'CRM Operations',
      path: '/customers',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS'] as Role[],
      icon: <UsersIcon size={18} />,
    },
    {
      label: 'Inventory',
      path: '/inventory',
      roles: ['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'] as Role[],
      icon: <InventoryIcon size={18} />,
    },
    {
      label: 'Stock Ledger',
      path: '/stock-ledger',
      roles: ['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS'] as Role[],
      icon: <LedgerIcon size={18} />,
    },
    {
      label: 'Sales Challans',
      path: '/challans',
      roles: ['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE'] as Role[],
      icon: <ChallanIcon size={18} />,
    },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const activePath = location.pathname;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Sidebar Desktop */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        zIndex: 50,
      }} className="desktop-sidebar">
        {/* Brand */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-primary)' }}>NEXORA</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>ERP & CRM</span>
          </div>
        </div>

        {/* Menu Navigation */}
        <nav style={{ flex: 1, padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {menuItems.map((item) => {
            if (item.roles && !hasRole(item.roles)) return null;

            const isActive = activePath === item.path || (item.path !== '/dashboard' && activePath.startsWith(item.path));

            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.925rem',
                  transition: 'all var(--transition-fast)',
                }}
                className={`nav-link-item ${isActive ? 'active' : ''}`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info Bottom */}
        <div style={{
          padding: '1.25rem',
          borderTop: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-tertiary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 600,
              color: 'var(--primary)'
            }}>
              {user?.name.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{user?.name}</h4>
              <span className={`badge ${
                user?.role === 'ADMIN' ? 'badge-danger' : user?.role === 'SALES' ? 'badge-success' : user?.role === 'WAREHOUSE' ? 'badge-info' : 'badge-warning'
              }`} style={{ fontSize: '0.6rem', padding: '0.1rem 0.4rem', marginTop: '0.2rem' }}>
                {user?.role}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              backgroundColor: 'transparent',
              color: 'var(--danger)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--danger-bg)';
              e.currentTarget.style.borderColor = 'rgba(185, 28, 28, 0.2)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '70px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2rem',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {location.pathname.startsWith('/dashboard') && 'Operational Overview'}
              {location.pathname.startsWith('/customers') && 'CRM Customer Database'}
              {location.pathname.startsWith('/inventory') && 'Product & Stock Management'}
              {location.pathname.startsWith('/stock-ledger') && 'Stock Movement Logs'}
              {location.pathname.startsWith('/challans') && 'Sales Challan Ledger'}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Quick Actions */}
            {hasRole(['ADMIN', 'SALES']) && (
              <Link to="/challans/new" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Create Challan
              </Link>
            )}
            <div style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: '1rem'
            }}>
              Active: <strong>{user?.email}</strong>
            </div>
          </div>
        </header>

        {/* View Outlet Container */}
        <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
          <div className="fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
