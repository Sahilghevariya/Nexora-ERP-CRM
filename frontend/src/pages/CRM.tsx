import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EditIcon, DeleteIcon, AddIcon } from '../components/Icons';

export const CRM: React.FC = () => {
  const { hasRole } = useAuth();
  const [customers, setCustomers] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<any[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    email: '',
    businessName: '',
    gstNumber: '',
    customerType: 'RETAIL',
    address: '',
    status: 'LEAD',
    followUpDate: '',
    notes: '',
  });

  const canEdit = hasRole(['ADMIN', 'SALES']);
  const canDelete = hasRole(['ADMIN']);

  const fetchCustomers = async (pageNo = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(pageNo),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('customerType', typeFilter);

      const response = await api.get(`/customers?${params.toString()}`);
      if (response.data.success) {
        setCustomers(response.data.data.customers);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error loading customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchCustomers(1);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, statusFilter, typeFilter]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormErrors([]);
    setFormData({
      name: '',
      mobile: '',
      email: '',
      businessName: '',
      gstNumber: '',
      customerType: 'RETAIL',
      address: '',
      status: 'LEAD',
      followUpDate: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (customer: any) => {
    setEditingId(customer.id);
    setFormErrors([]);
    setFormData({
      name: customer.name,
      mobile: customer.mobile,
      email: customer.email,
      businessName: customer.businessName,
      gstNumber: customer.gstNumber || '',
      customerType: customer.customerType,
      address: customer.address,
      status: customer.status,
      followUpDate: customer.followUpDate ? new Date(customer.followUpDate).toISOString().split('T')[0] : '',
      notes: customer.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    // Format followUpDate correctly
    const submitData = {
      ...formData,
      followUpDate: formData.followUpDate ? new Date(formData.followUpDate).toISOString() : null,
      gstNumber: formData.gstNumber || undefined,
    };

    try {
      if (editingId) {
        await api.put(`/customers/${editingId}`, submitData);
        setSuccessMsg('Customer profile updated successfully!');
      } else {
        await api.post('/customers', submitData);
        setSuccessMsg('Customer profile registered successfully!');
      }
      setIsModalOpen(false);
      fetchCustomers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Failed to save customer');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer record?')) return;
    try {
      await api.delete(`/customers/${id}`);
      setSuccessMsg('Customer profile deleted successfully!');
      fetchCustomers(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete operation failed');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Success Notifications Banner */}
      {successMsg && (
        <div style={{
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.75rem 1rem',
          fontSize: '0.9rem',
          fontWeight: 600
        }}>
          {successMsg}
        </div>
      )}

      {/* Search and filter action row */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search CRM customers (name, business, email)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: '130px' }}>
            <option value="">All Statuses</option>
            <option value="LEAD">Leads</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ width: '140px' }}>
            <option value="">All Types</option>
            <option value="RETAIL">Retail</option>
            <option value="WHOLESALE">Wholesale</option>
            <option value="DISTRIBUTOR">Distributor</option>
          </select>
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AddIcon size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Database list table */}
      {isLoading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading customer logs...</div>
      ) : customers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          No customer profiles found matching filters.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact Details</th>
                  <th>Business Info</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Next Follow Up</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Created by: {c.createdBy?.name}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.9rem' }}>{c.mobile}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{c.businessName}</div>
                      {c.gstNumber && <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSTIN: {c.gstNumber}</code>}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {c.customerType.toLowerCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${
                        c.status === 'ACTIVE' ? 'badge-success' : c.status === 'LEAD' ? 'badge-info' : 'badge-danger'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.followUpDate ? (
                        <div style={{
                          color: new Date(c.followUpDate) <= new Date() ? 'var(--warning)' : 'var(--text-primary)',
                          fontWeight: new Date(c.followUpDate) <= new Date() ? 600 : 400
                        }}>
                          {new Date(c.followUpDate).toLocaleDateString()}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          onClick={() => { setSelectedCustomer(c); setIsDetailModalOpen(true); }}
                        >
                          View
                        </button>
                        {canEdit && (
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleOpenEditModal(c)}
                          >
                            <EditIcon size={12} /> Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            className="btn btn-danger"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                            onClick={() => handleDelete(c.id)}
                          >
                            <DeleteIcon size={12} /> Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div>
              Showing {customers.length} of {pagination.total} entries
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page <= 1}
                onClick={() => fetchCustomers(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchCustomers(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal Dialog Overlay */}
      {isModalOpen && (
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
            maxWidth: '650px',
            maxHeight: '90vh',
            overflowY: 'auto',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>{editingId ? 'Edit Customer Profile' : 'Add New Customer Profile'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            {formErrors.length > 0 && (
              <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Validation Errors:</div>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {formErrors.map((err, i) => (
                    <li key={i}><strong>{err.field}</strong>: {err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. John Doe"
                  />
                </div>

                <div className="form-group">
                  <label>Business Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="e.g. Acme Stores"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    placeholder="10-digit mobile"
                  />
                </div>

                <div className="form-group">
                  <label>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="client@mail.com"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>GST Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.gstNumber}
                    onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    placeholder="15-digit GSTIN"
                  />
                </div>

                <div className="form-group">
                  <label>Customer Segment *</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => setFormData({ ...formData, customerType: e.target.value })}
                  >
                    <option value="RETAIL">Retail</option>
                    <option value="WHOLESALE">Wholesale</option>
                    <option value="DISTRIBUTOR">Distributor</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Lead Status *</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="LEAD">Lead</option>
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Next Follow Up Date</label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Address *</label>
                <textarea
                  rows={2}
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Complete billing address"
                />
              </div>

              <div className="form-group">
                <label>Notes / Follow Up Remarks</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key pointers regarding customer interaction..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Details Modal Overlay */}
      {isDetailModalOpen && selectedCustomer && (
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
            maxWidth: '550px',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Customer Profile Details</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.925rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Name</label>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.15rem' }}>{selectedCustomer.name}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Business Name</label>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.15rem', color: 'var(--primary-hover)' }}>{selectedCustomer.businessName}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mobile Number</label>
                  <div style={{ marginTop: '0.15rem' }}>📞 {selectedCustomer.mobile}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Email Address</label>
                  <div style={{ marginTop: '0.15rem' }}>✉️ {selectedCustomer.email}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>GSTIN (GST Number)</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600 }}>{selectedCustomer.gstNumber || <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>Not Registered</span>}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Customer Type</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600, textTransform: 'capitalize' }}>{selectedCustomer.customerType.toLowerCase()}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lead Status</label>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge ${
                      selectedCustomer.status === 'ACTIVE' ? 'badge-success' : selectedCustomer.status === 'LEAD' ? 'badge-info' : 'badge-danger'
                    }`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Next Follow Up Date</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600 }}>
                    {selectedCustomer.followUpDate ? `📅 ${new Date(selectedCustomer.followUpDate).toLocaleDateString()}` : <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>No Follow-Up Set</span>}
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Billing Address</label>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>
                  {selectedCustomer.address}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Follow Up Notes & Remarks</label>
                <div style={{ backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', marginTop: '0.25rem', minHeight: '60px', whiteSpace: 'pre-wrap' }}>
                  {selectedCustomer.notes || <span style={{ color: 'var(--text-muted)' }}>No follow-up notes recorded.</span>}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Registered by: <strong>{selectedCustomer.createdBy?.name || 'Unknown'}</strong></span>
                <span>System ID: <code>{selectedCustomer.id.slice(0, 8)}...</code></span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsDetailModalOpen(false)}>
                Close
              </button>
              {canEdit && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleOpenEditModal(selectedCustomer);
                  }}
                >
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
