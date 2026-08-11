import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

export const StockLedger: React.FC = () => {
  const [movements, setMovements] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchMovements = async (pageNo = 1) => {
    try {
      setIsLoading(true);
      const response = await api.get(`/stock/movements?page=${pageNo}&limit=15`);
      if (response.data.success) {
        setMovements(response.data.data.movements);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error fetching ledger logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMovements(1);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Intro info box */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.4rem' }}>
          🛡️ Stock Movement Audit Log
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          This log record is write-once and acts as the single source of truth ledger tracking all manual and sales-driven inventory modifications.
        </p>
      </div>

      {/* Audit table */}
      {isLoading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading ledger...</div>
      ) : movements.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          📜 Ledger is empty. No inventory activities logged.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Product</th>
                  <th>SKU Code</th>
                  <th>Quantity Change</th>
                  <th>Type</th>
                  <th>Logged By</th>
                  <th>Reason/Reference Description</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.createdAt).toLocaleString('en-IN')}</td>
                    <td style={{ fontWeight: 600 }}>{m.product?.name || 'Deleted Product'}</td>
                    <td><code>{m.product?.sku || 'N/A'}</code></td>
                    <td style={{
                      color: m.movementType === 'IN' ? 'var(--success)' : 'var(--danger)',
                      fontWeight: 700
                    }}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} Units
                    </td>
                    <td>
                      <span className={`badge ${m.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                        {m.movementType}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{m.createdBy?.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({m.createdBy?.role})</div>
                    </td>
                    <td>{m.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div>
              Showing {movements.length} of {pagination.total} entries
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page <= 1}
                onClick={() => fetchMovements(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchMovements(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
