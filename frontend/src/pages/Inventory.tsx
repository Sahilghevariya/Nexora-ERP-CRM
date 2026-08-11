import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { EditIcon, DeleteIcon, AddIcon } from '../components/Icons';

export const Inventory: React.FC = () => {
  const { hasRole } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustProductId, setAdjustProductId] = useState<string | null>(null);
  const [adjustProductName, setAdjustProductName] = useState('');
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productMovements, setProductMovements] = useState<any[]>([]);
  const [isMovementsLoading, setIsMovementsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formErrors, setFormErrors] = useState<any[]>([]);
  
  // Product Form Data
  const [productData, setProductData] = useState({
    name: '',
    sku: '',
    category: '',
    unitPrice: 0,
    currentStock: 0,
    minStockAlertQty: 5,
    locationWarehouse: '',
  });

  // Stock Adjustment Form Data
  const [adjustData, setAdjustData] = useState({
    quantity: 1,
    movementType: 'IN',
    reason: '',
  });

  const canEdit = hasRole(['ADMIN', 'WAREHOUSE']);

  const fetchProducts = async (pageNo = 1) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: String(pageNo),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await api.get(`/products?${params.toString()}`);
      if (response.data.success) {
        setProducts(response.data.data.products);
        setPagination(response.data.data.pagination);
      }
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchProducts(1);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [search, categoryFilter]);

  const handleOpenProductCreate = () => {
    setEditingId(null);
    setFormErrors([]);
    setProductData({
      name: '',
      sku: '',
      category: '',
      unitPrice: 0,
      currentStock: 0,
      minStockAlertQty: 5,
      locationWarehouse: '',
    });
    setIsProductModalOpen(true);
  };

  const handleOpenProductEdit = (prod: any) => {
    setEditingId(prod.id);
    setFormErrors([]);
    setProductData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitPrice: Number(prod.unitPrice),
      currentStock: prod.currentStock,
      minStockAlertQty: prod.minStockAlertQty,
      locationWarehouse: prod.locationWarehouse,
    });
    setIsProductModalOpen(true);
  };

  const handleOpenAdjustStock = (prod: any) => {
    setAdjustProductId(prod.id);
    setAdjustProductName(prod.name);
    setFormErrors([]);
    setAdjustData({
      quantity: 1,
      movementType: 'IN',
      reason: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleOpenProductDetails = async (prod: any) => {
    setSelectedProduct(prod);
    setIsDetailModalOpen(true);
    setIsMovementsLoading(true);
    setProductMovements([]);
    try {
      const response = await api.get(`/stock/movements?productId=${prod.id}`);
      if (response.data.success) {
        setProductMovements(response.data.data.movements || []);
      }
    } catch (err) {
      console.error('Error fetching movements for product:', err);
    } finally {
      setIsMovementsLoading(false);
    }
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const submitData = {
      ...productData,
      unitPrice: Number(productData.unitPrice),
      currentStock: Number(productData.currentStock),
      minStockAlertQty: Number(productData.minStockAlertQty),
    };

    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, submitData);
        setSuccessMsg('Product details updated successfully!');
      } else {
        await api.post('/products', submitData);
        setSuccessMsg('Product registered in catalog successfully!');
      }
      setIsProductModalOpen(false);
      fetchProducts(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Failed to save product');
      }
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors([]);

    const submitData = {
      productId: adjustProductId,
      quantity: Number(adjustData.quantity),
      movementType: adjustData.movementType,
      reason: adjustData.reason,
    };

    try {
      await api.post('/stock/adjust', submitData);
      setSuccessMsg('Manual stock adjustment logged successfully!');
      setIsAdjustModalOpen(false);
      fetchProducts(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      if (err.response?.data?.errors) {
        setFormErrors(err.response.data.errors);
      } else {
        alert(err.response?.data?.message || 'Failed to adjust stock');
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product permanently? This may break historical links if referenced.')) return;
    try {
      await api.delete(`/products/${id}`);
      setSuccessMsg('Product deleted successfully from database!');
      fetchProducts(pagination.page);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Toast Notification Banner */}
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

      {/* Filters row */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flex: 1, minWidth: '280px', gap: '0.75rem' }}>
          <input
            type="text"
            placeholder="Search items by name, SKU, or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            type="text"
            placeholder="Category filter..."
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '180px' }}
          />
        </div>

        {canEdit && (
          <button className="btn btn-primary" onClick={handleOpenProductCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <AddIcon size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Product table catalog */}
      {isLoading ? (
        <div style={{ color: 'var(--text-secondary)' }}>Loading catalog...</div>
      ) : products.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          📦 No products in stock or catalog database.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU Code</th>
                  <th>Category</th>
                  <th>Unit Price (INR)</th>
                  <th style={{ textAlign: 'center' }}>Stock Status</th>
                  <th>Warehouse Location</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const isLowStock = p.currentStock <= p.minStockAlertQty;
                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.name}</td>
                      <td><code>{p.sku}</code></td>
                      <td>{p.category}</td>
                      <td>₹ {Number(p.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`} style={{ fontWeight: 700 }}>
                          {p.currentStock} Units
                        </span>
                        {isLowStock && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--danger)', marginTop: '0.2rem', fontWeight: 600 }}>
                            Below alert lvl ({p.minStockAlertQty})
                          </div>
                        )}
                      </td>
                      <td>{p.locationWarehouse}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                            onClick={() => handleOpenProductDetails(p)}
                          >
                            View
                          </button>
                          {canEdit && (
                            <button
                              className="btn btn-success"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                              onClick={() => handleOpenAdjustStock(p)}
                            >
                              Adjust Stock
                            </button>
                          )}
                          {canEdit && (
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => handleOpenProductEdit(p)}
                            >
                              <EditIcon size={12} /> Edit
                            </button>
                          )}
                          {hasRole(['ADMIN']) && (
                            <button
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                              onClick={() => handleDeleteProduct(p.id)}
                            >
                              <DeleteIcon size={12} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <div>
              Showing {products.length} of {pagination.total} entries
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page <= 1}
                onClick={() => fetchProducts(pagination.page - 1)}
              >
                Previous
              </button>
              <button
                className="btn btn-secondary"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                disabled={pagination.page >= pagination.pages}
                onClick={() => fetchProducts(pagination.page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Create/Edit Modal overlay */}
      {isProductModalOpen && (
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
              <h3 style={{ fontSize: '1.25rem' }}>{editingId ? 'Edit Catalog Item' : 'Add New Catalog Item'}</h3>
              <button onClick={() => setIsProductModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
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

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  required
                  value={productData.name}
                  onChange={(e) => setProductData({ ...productData, name: e.target.value })}
                  placeholder="e.g. Mechanical Keyboard"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>SKU / Barcode Code *</label>
                  <input
                    type="text"
                    required
                    value={productData.sku}
                    onChange={(e) => setProductData({ ...productData, sku: e.target.value })}
                    placeholder="e.g. ACC-KEY-K2"
                    disabled={!!editingId}
                  />
                </div>

                <div className="form-group">
                  <label>Category *</label>
                  <input
                    type="text"
                    required
                    value={productData.category}
                    onChange={(e) => setProductData({ ...productData, category: e.target.value })}
                    placeholder="e.g. Accessories"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Unit Sale Price (INR) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={productData.unitPrice}
                    onChange={(e) => setProductData({ ...productData, unitPrice: Number(e.target.value) })}
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>Min Safety Stock Alert *</label>
                  <input
                    type="number"
                    required
                    value={productData.minStockAlertQty}
                    onChange={(e) => setProductData({ ...productData, minStockAlertQty: Number(e.target.value) })}
                  />
                </div>
              </div>

              {!editingId && (
                <div className="form-group">
                  <label>Initial Quantity in Hand</label>
                  <input
                    type="number"
                    value={productData.currentStock}
                    onChange={(e) => setProductData({ ...productData, currentStock: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Warehouse Placement / Location *</label>
                <input
                  type="text"
                  required
                  value={productData.locationWarehouse}
                  onChange={(e) => setProductData({ ...productData, locationWarehouse: e.target.value })}
                  placeholder="e.g. Aisle A3, Rack 2"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjust Modal overlay */}
      {isAdjustModalOpen && (
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
            maxWidth: '500px',
            backgroundColor: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Manual Stock Adjust</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Adjusting stock counts for product: <strong style={{ color: 'var(--text-primary)' }}>{adjustProductName}</strong>
            </div>

            <form onSubmit={handleAdjustSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustData.quantity}
                    onChange={(e) => setAdjustData({ ...adjustData, quantity: Number(e.target.value) })}
                  />
                </div>

                <div className="form-group">
                  <label>Adjustment Type *</label>
                  <select
                    value={adjustData.movementType}
                    onChange={(e) => setAdjustData({ ...adjustData, movementType: e.target.value })}
                  >
                    <option value="IN">Intake / Addition (+)</option>
                    <option value="OUT">Deduction / Waste (-)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Reason Description *</label>
                <input
                  type="text"
                  required
                  value={adjustData.reason}
                  onChange={(e) => setAdjustData({ ...adjustData, reason: e.target.value })}
                  placeholder="e.g. Monthly stock Audit, Scrap damage"
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Apply Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Details & Historical Stock Ledger Modal Overlay */}
      {isDetailModalOpen && selectedProduct && (
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
            backgroundColor: 'var(--bg-secondary)',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Product Details & Ledger</h3>
              <button onClick={() => setIsDetailModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontSize: '0.925rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Product Name</label>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginTop: '0.15rem' }}>{selectedProduct.name}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SKU / Barcode Code</label>
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', marginTop: '0.15rem', color: 'var(--primary-hover)' }}>{selectedProduct.sku}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Category</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600 }}>{selectedProduct.category}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Unit Sale Price</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600 }}>₹ {Number(selectedProduct.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Inventory Stock</label>
                  <div style={{ marginTop: '0.25rem' }}>
                    <span className={`badge ${selectedProduct.currentStock <= selectedProduct.minStockAlertQty ? 'badge-danger' : 'badge-success'}`} style={{ fontWeight: 700 }}>
                      {selectedProduct.currentStock} Units available
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Warehouse Placement / Location</label>
                  <div style={{ marginTop: '0.15rem', fontWeight: 600 }}>📍 {selectedProduct.locationWarehouse}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  Stock Movement History
                </h4>
                
                {isMovementsLoading ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading history ledger...</div>
                ) : productMovements.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    No inventory ledger history tracked for this item.
                  </div>
                ) : (
                  <div className="table-container" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Qty</th>
                          <th>Type</th>
                          <th>User</th>
                          <th>Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productMovements.map((move: any) => (
                          <tr key={move.id}>
                            <td style={{ fontSize: '0.75rem' }}>{new Date(move.createdAt).toLocaleDateString()}</td>
                            <td style={{
                              color: move.movementType === 'IN' ? 'var(--success)' : 'var(--danger)',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              {move.quantity > 0 ? `+${move.quantity}` : move.quantity}
                            </td>
                            <td>
                              <span className={`badge ${move.movementType === 'IN' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}>
                                {move.movementType}
                              </span>
                            </td>
                            <td style={{ fontSize: '0.75rem' }}>{move.createdBy?.name || 'Staff'}</td>
                            <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{move.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
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
                    handleOpenProductEdit(selectedProduct);
                  }}
                >
                  Edit Catalog
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
