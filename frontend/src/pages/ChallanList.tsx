import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { AddIcon } from '../components/Icons';

export const ChallanList: React.FC = () => {
  const { hasRole } = useAuth();
  const [challans, setChallans] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState<'DRAFT' | 'CONFIRMED' | 'CANCELLED' | ''>('');
  const [isLoading, setIsLoading] = useState(true);

  // Detail Modal state
  const [activeChallan, setActiveChallan] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionDeficits, setActionDeficits] = useState<any[]>([]);

  const fetchChallans = async (pageNo = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(pageNo),
        limit: '10',
      });
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/challans?${params.toString()}`);
      if (response.data.success) {
        setChallans(response.data.data.challans);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching challans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChallans(1);
  }, [statusFilter]);

  const handleOpenDetail = async (id: string) => {
    try {
      setActionError(null);
      setActionDeficits([]);
      const response = await api.get(`/challans/${id}`);
      if (response.data.success) {
        setActiveChallan(response.data.data.challan);
        setIsDetailOpen(true);
      }
    } catch (err) {
      alert('Failed to load challan details');
    }
  };

  const handleConfirmChallan = async (id: string) => {
    if (!window.confirm('Confirm Challan? This will lock row databases and deduct stock levels.')) return;
    setActionError(null);
    setActionDeficits([]);
    try {
      const response = await api.post(`/challans/${id}/confirm`);
      alert(response.data.message);
      setIsDetailOpen(false);
      fetchChallans(pagination.page);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setActionDeficits(err.response.data.errors);
        setActionError(err.response.data.message || 'Deficit items discovered');
      } else {
        setActionError(err.response?.data?.message || 'Stock deduction failed');
      }
    }
  };

  const handleCancelChallan = async (id: string) => {
    if (!window.confirm('Cancel Challan? This is irreversible and will restock inventory (if confirmed).')) return;
    setActionError(null);
    setActionDeficits([]);
    try {
      const response = await api.post(`/challans/${id}/cancel`);
      alert(response.data.message);
      setIsDetailOpen(false);
      fetchChallans(pagination.page);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Cancellation failed');
    }
  };

  const handleDownloadPDF = (id: string, challanNumber: string) => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    const token = localStorage.getItem('token');
    
    // Download using standard anchor tag with Authorization credentials
    fetch(`${API_URL}/challans/${id}/pdf`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(response => {
      if (!response.ok) throw new Error('PDF Generation failed');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${challanNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    })
    .catch(err => {
      console.error(err);
      alert('Failed to generate PDF');
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Sub menu status tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          display: 'inline-flex',
          backgroundColor: 'var(--bg-secondary)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-color)'
        }}>
          {(['', 'DRAFT', 'CONFIRMED', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '0.5rem 1.25rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                backgroundColor: statusFilter === status ? 'var(--primary)' : 'transparent',
                color: statusFilter === status ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.15s ease'
              }}
            >
              {status === '' ? 'All Challans' : status}
            </button>
          ))}
        </div>

        {hasRole(['ADMIN', 'SALES']) && (
          <Link to="/challans/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AddIcon size={16} /> Create Sales Challan
          </Link>
        )}
      </div>

      {/* Grid listing */}
      {isLoading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading Challans...</div>
      ) : challans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No Sales Challans found matching filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Challan #</th>
                  <th>Customer/Business</th>
                  <th>Date Created</th>
                  <th>Grand Total (INR)</th>
                  <th>Status</th>
                  <th>Creator</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challans.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 700 }}>{c.challanNumber}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{c.customerSnapshot.businessName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.customerSnapshot.name}</div>
                    </td>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 600 }}>
                      ₹ {Number(c.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${
                        c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td>{c.createdBy?.name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleOpenDetail(c.id)}
                        >
                          View
                        </button>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => handleDownloadPDF(c.id, c.challanNumber)}
                        >
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div>
              Showing {challans.length} of {pagination.total} entries
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page <= 1}
                onClick={() => fetchChallans(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchChallans(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Challan Details Modal Overlay */}
      {isDetailOpen && activeChallan && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1.5rem'
        }}>
          <div className="card fade-in" style={{
            width: '100%',
            maxWidth: '750px',
            backgroundColor: 'var(--bg-secondary)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Challan: {activeChallan.challanNumber}</h3>
                <span className={`badge ${
                  activeChallan.status === 'CONFIRMED' ? 'badge-success' : activeChallan.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'
                }`} style={{ marginTop: '0.4rem' }}>
                  {activeChallan.status}
                </span>
              </div>
              <button onClick={() => setIsDetailOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            {/* Error alerts */}
            {actionError && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>Error:</span> {actionError}
                {actionDeficits.length > 0 && (
                  <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
                    {actionDeficits.map((def, i) => (
                      <li key={i}>
                        Product <strong>{def.name}</strong> (SKU: {def.sku}) - Requested: {def.requested}, Available: {def.available} units.
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Client Snapshot info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Billed To:</h4>
                <div style={{ fontWeight: 600 }}>{activeChallan.customerSnapshot.name}</div>
                <div style={{ fontWeight: 700, margin: '0.2rem 0' }}>{activeChallan.customerSnapshot.businessName}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{activeChallan.customerSnapshot.address}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>📞 {activeChallan.customerSnapshot.mobile} | ✉️ {activeChallan.customerSnapshot.email}</div>
                {activeChallan.customerSnapshot.gstNumber && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: '0.2rem' }}>GSTIN: {activeChallan.customerSnapshot.gstNumber}</div>}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Workflow Metadata:</h4>
                <div style={{ fontSize: '0.9rem' }}>Created: <strong>{new Date(activeChallan.createdAt).toLocaleString()}</strong> by {activeChallan.createdBy?.name}</div>
                {activeChallan.confirmedAt && (
                  <div style={{ fontSize: '0.9rem' }}>Confirmed: <strong>{new Date(activeChallan.confirmedAt).toLocaleString()}</strong> by {activeChallan.confirmedBy?.name}</div>
                )}
                {activeChallan.cancelledAt && (
                  <div style={{ fontSize: '0.9rem' }}>Cancelled: <strong>{new Date(activeChallan.cancelledAt).toLocaleString()}</strong> by {activeChallan.cancelledBy?.name}</div>
                )}
              </div>
            </div>

            {/* Products snapshots listing */}
            <div>
              <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Line Items:</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>SKU Code</th>
                      <th>Product Name</th>
                      <th style={{ textAlign: 'right' }}>Price (INR)</th>
                      <th style={{ textAlign: 'center' }}>Quantity</th>
                      <th style={{ textAlign: 'right' }}>Total (INR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeChallan.items.map((item: any) => (
                      <tr key={item.id}>
                        <td><code>{item.productSnapshot.sku}</code></td>
                        <td style={{ fontWeight: 600 }}>{item.productSnapshot.name}</td>
                        <td style={{ textAlign: 'right' }}>₹ {Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700 }}>₹ {Number(item.totalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderTop: '2px solid var(--border-color)' }}>
                      <td colSpan={3} />
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>Grand Total:</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary-hover)', fontWeight: 800, fontSize: '1rem' }}>
                        ₹ {Number(activeChallan.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons footer */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }} onClick={() => handleDownloadPDF(activeChallan.id, activeChallan.challanNumber)}>
                📥 Download PDF Invoice
              </button>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsDetailOpen(false)}>
                  Close
                </button>
                {activeChallan.status === 'DRAFT' && hasRole(['ADMIN', 'SALES']) && (
                  <button className="btn btn-success" onClick={() => handleConfirmChallan(activeChallan.id)}>
                    ✔️ Confirm Challan
                  </button>
                )}
                {activeChallan.status === 'CONFIRMED' && hasRole(['ADMIN', 'ACCOUNTS']) && (
                  <button className="btn btn-danger" onClick={() => handleCancelChallan(activeChallan.id)}>
                    ❌ Cancel & Restock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
