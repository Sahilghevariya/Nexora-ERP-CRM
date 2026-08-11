import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ProductIcon, UsersIcon, ChallanIcon } from '../components/Icons';

export const Overview: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/dashboard/stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      console.error('Error loading dashboard statistics:', err);
      setError(err.response?.data?.message || 'Failed to fetch dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading Dashboard Overview statistics...</div>;
  }

  if (error || !stats) {
    return (
      <div className="card" style={{ border: '1px solid var(--danger)', padding: '2rem', textAlign: 'center' }}>
        <h3 style={{ color: 'var(--danger)', marginBottom: '0.5rem' }}>Dashboard Error</h3>
        <p style={{ color: 'var(--text-secondary)' }}>{error || 'Failed to load stats.'}</p>
        <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={fetchDashboardStats}>
          Retry Load
        </button>
      </div>
    );
  }



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Welcome Banner */}
      <div className="card" style={{ padding: '1.5rem 2rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.4rem' }}>
          Welcome back, {user?.name}!
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem' }}>
          Logged in as: <strong style={{ color: 'var(--primary)', textTransform: 'capitalize' }}>{user?.role.toLowerCase()}</strong>. Nexora Operations Portal.
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 1. ADMIN DASHBOARD */}
      {/* ========================================================================= */}
      {user?.role === 'ADMIN' && (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProductIcon size={22} stroke="var(--info)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Catalog Items</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.products.total} Products</h3>
                <div style={{ fontSize: '0.75rem', color: stats.products.lowStock > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {stats.products.lowStock} Low stock alerts
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={22} stroke="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>CRM Clients</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.customers.total} Total</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.customers.active} Active | {stats.customers.lead} Leads
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallanIcon size={22} stroke="var(--warning)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sales Challans</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.challans.total} Ledger</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.challans.draft} Draft | {stats.challans.confirmed} Confirmed
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallanIcon size={22} stroke="var(--success)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Grand Revenue</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem', color: 'var(--success)' }}>
                  ₹ {stats.challans.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From confirmed invoices</div>
              </div>
            </div>
          </div>

          {/* Panels */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Critical Safety Stock Alerts</h3>
              {stats.products.criticalList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>Safety check: No items are currently below safety thresholds!</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th style={{ textAlign: 'center' }}>Stock</th>
                        <th style={{ textAlign: 'center' }}>Safety Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.products.criticalList.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><code>{p.sku}</code></td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 700 }}>{p.currentStock}</td>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.minStockAlertQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/inventory" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>Open catalog database &rarr;</Link>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Chronological Stock Adjustments</h3>
              {stats.recentMovements.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>No inventory changes logged in database.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Delta</th>
                        <th>Type</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentMovements.map((m: any) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.product?.name || 'Deleted'}</td>
                          <td style={{ color: m.movementType === 'IN' ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td>
                            <span className={`badge ${m.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>
                              {m.movementType}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/stock-ledger" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>Open audit ledger &rarr;</Link>
            </div>
          </div>

          {/* Recent Challans */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Invoices & Challans</h3>
            {stats.recentChallans.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem' }}>No Sales Challans recorded.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Challan ID</th>
                      <th>Business Name</th>
                      <th>Contact Person</th>
                      <th>Amount (INR)</th>
                      <th>Status</th>
                      <th>Created By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentChallans.map((c: any) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.challanNumber}</td>
                        <td style={{ fontWeight: 600 }}>{c.customerSnapshot.businessName}</td>
                        <td>{c.customerSnapshot.name}</td>
                        <td style={{ fontWeight: 700 }}>₹ {Number(c.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge ${c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                            {c.status}
                          </span>
                        </td>
                        <td>{c.createdBy?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/challans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right' }}>Open challans ledger &rarr;</Link>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 2. SALES DASHBOARD */}
      {/* ========================================================================= */}
      {user?.role === 'SALES' && (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={22} stroke="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>CRM Clients</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.customers.total} Total</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.customers.active} Active | {stats.customers.lead} Leads
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallanIcon size={22} stroke="var(--warning)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sales Challans</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.challans.total} Ledger</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.challans.draft} Draft | {stats.challans.confirmed} Confirmed
                </div>
              </div>
            </div>
          </div>

          {/* Panels Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Sales Invoices</h3>
              {stats.recentChallans.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>No Sales Challans recorded.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Challan ID</th>
                        <th>Business</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentChallans.map((c: any) => (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 700 }}>{c.challanNumber}</td>
                          <td style={{ fontWeight: 600 }}>{c.customerSnapshot.businessName}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/challans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>Open challans ledger &rarr;</Link>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Product Stock Availability Alerts</h3>
              {stats.products.criticalList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>All catalog inventory levels check out normal.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th style={{ textAlign: 'center' }}>Stock</th>
                        <th>Warehouse Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.products.criticalList.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 700 }}>{p.currentStock} Units</td>
                          <td>{p.locationWarehouse}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/inventory" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>View product availability &rarr;</Link>
            </div>
          </div>

          {/* Customer Follow Ups list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Upcoming Customer Follow-Ups</h3>
            {!stats.upcomingFollowUps || stats.upcomingFollowUps.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem' }}>No upcoming follow-up schedules logs recorded.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Customer Name</th>
                      <th>Business Name</th>
                      <th>Follow-Up Date</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcomingFollowUps.map((c: any) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td>{c.businessName}</td>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {new Date(c.followUpDate).toLocaleDateString()}
                        </td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/customers" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right' }}>Open CRM database &rarr;</Link>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. WAREHOUSE DASHBOARD */}
      {/* ========================================================================= */}
      {user?.role === 'WAREHOUSE' && (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ProductIcon size={22} stroke="var(--info)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Catalog Items</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.products.total} Products</h3>
                <div style={{ fontSize: '0.75rem', color: stats.products.lowStock > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                  {stats.products.lowStock} Low stock alerts
                </div>
              </div>
            </div>
          </div>

          {/* Panels Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Critical Safety Stock Alerts</h3>
              {stats.products.criticalList.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>Safety check: No items are currently below safety thresholds!</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>SKU</th>
                        <th style={{ textAlign: 'center' }}>Stock</th>
                        <th style={{ textAlign: 'center' }}>Safety Level</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.products.criticalList.map((p: any) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}</td>
                          <td><code>{p.sku}</code></td>
                          <td style={{ textAlign: 'center', color: 'var(--danger)', fontWeight: 700 }}>{p.currentStock}</td>
                          <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{p.minStockAlertQty}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/inventory" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>Open catalog database &rarr;</Link>
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Chronological Stock Adjustments</h3>
              {stats.recentMovements.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem 0' }}>No inventory changes logged in database.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Delta</th>
                        <th>Type</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentMovements.map((m: any) => (
                        <tr key={m.id}>
                          <td style={{ fontWeight: 600 }}>{m.product?.name || 'Deleted'}</td>
                          <td style={{ color: m.movementType === 'IN' ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                            {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                          </td>
                          <td>
                            <span className={`badge ${m.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>
                              {m.movementType}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link to="/stock-ledger" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right', marginTop: 'auto' }}>Open audit ledger &rarr;</Link>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* 4. ACCOUNTS DASHBOARD */}
      {/* ========================================================================= */}
      {user?.role === 'ACCOUNTS' && (
        <>
          {/* KPI Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <UsersIcon size={22} stroke="var(--primary)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>CRM Clients</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.customers.total} Total</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.customers.active} Active | {stats.customers.lead} Leads
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallanIcon size={22} stroke="var(--warning)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Sales Challans</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem' }}>{stats.challans.total} Ledger</h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {stats.challans.draft} Draft | {stats.challans.confirmed} Confirmed
                </div>
              </div>
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--success-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChallanIcon size={22} stroke="var(--success)" />
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Grand Revenue</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.1rem', color: 'var(--success)' }}>
                  ₹ {stats.challans.totalRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </h3>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From confirmed invoices</div>
              </div>
            </div>
          </div>

          {/* Recent Confirmed Transactions list */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Sales Invoices & Billing Records</h3>
            {stats.recentChallans.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', padding: '1rem' }}>No Sales Challans recorded.</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Challan ID</th>
                      <th>Business Name</th>
                      <th>Billing Contact</th>
                      <th>Invoiced Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recentChallans.map((c: any) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 700 }}>{c.challanNumber}</td>
                        <td style={{ fontWeight: 600 }}>{c.customerSnapshot.businessName}</td>
                        <td>{c.customerSnapshot.name}</td>
                        <td style={{ fontWeight: 700, color: c.status === 'CONFIRMED' ? 'var(--success)' : 'inherit' }}>
                          ₹ {Number(c.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span className={`badge ${c.status === 'CONFIRMED' ? 'badge-success' : c.status === 'DRAFT' ? 'badge-warning' : 'badge-danger'}`} style={{ fontSize: '0.65rem' }}>
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Link to="/challans" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', textAlign: 'right' }}>Open billing ledger &rarr;</Link>
          </div>
        </>
      )}
    </div>
  );
};
export default Overview;
