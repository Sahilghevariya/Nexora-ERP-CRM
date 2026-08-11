import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DashboardShell } from './components/Layout/DashboardShell';

// Pages
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { CRM } from './pages/CRM';
import { Inventory } from './pages/Inventory';
import { StockLedger } from './pages/StockLedger';
import { ChallanList } from './pages/ChallanList';
import { ChallanCreate } from './pages/ChallanCreate';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Sign In View */}
          <Route path="/login" element={<Login />} />

          {/* Secure Operational Workspace */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardShell />
              </ProtectedRoute>
            }
          >
            {/* Redirect base path to Overview */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            <Route path="dashboard" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <Overview />
              </ProtectedRoute>
            } />
            
            <Route path="customers" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS']}>
                <CRM />
              </ProtectedRoute>
            } />
            
            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']}>
                <Inventory />
              </ProtectedRoute>
            } />
            
            <Route path="stock-ledger" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'WAREHOUSE', 'SALES', 'ACCOUNTS']}>
                <StockLedger />
              </ProtectedRoute>
            } />
            
            <Route path="challans" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES', 'ACCOUNTS', 'WAREHOUSE']}>
                <ChallanList />
              </ProtectedRoute>
            } />
            
            <Route path="challans/new" element={
              <ProtectedRoute allowedRoles={['ADMIN', 'SALES']}>
                <ChallanCreate />
              </ProtectedRoute>
            } />
          </Route>

          {/* Fallback routing */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
