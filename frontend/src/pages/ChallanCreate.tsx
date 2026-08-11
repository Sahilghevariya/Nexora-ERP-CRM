import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { AddIcon, DeleteIcon } from '../components/Icons';

interface CartItem {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  availableStock: number;
  quantity: number;
}

export const ChallanCreate: React.FC = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Cart items State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Product Search State
  const [productSearch, setProductSearch] = useState('');
  const [searchedProducts, setSearchedProducts] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deficits, setDeficits] = useState<any[]>([]);

  useEffect(() => {
    const bootstrapWizard = async () => {
      try {
        setIsLoading(true);
        // Load active customers and initial products catalog
        const [custRes, prodRes] = await Promise.all([
          api.get('/customers?limit=100&status=ACTIVE'),
          api.get('/products?limit=100'),
        ]);

        setCustomers(custRes.data.data.customers || []);
        const allProducts = prodRes.data.data.products || [];
        setProducts(allProducts);
        setSearchedProducts(allProducts.slice(0, 5)); // show first 5 products initially
      } catch (err) {
        console.error('Bootstrap failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapWizard();
  }, []);

  // Filter products locally as search string changes
  useEffect(() => {
    if (!productSearch) {
      setSearchedProducts(products.slice(0, 5));
      return;
    }
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase())
    );
    setSearchedProducts(filtered.slice(0, 5));
  }, [productSearch, products]);

  const handleAddToCart = (product: any) => {
    // Check if already in cart
    const existingIndex = cart.findIndex((item) => item.productId === product.id);

    if (existingIndex >= 0) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].quantity + 1;
      
      // Visual alert if in-memory quantity exceeds available stock
      if (newQty > product.currentStock) {
        alert(`Warning: Requested quantity (${newQty}) exceeds available stock (${product.currentStock})`);
      }
      
      updatedCart[existingIndex].quantity = newQty;
      setCart(updatedCart);
    } else {
      if (product.currentStock <= 0) {
        alert(`Warning: Product is currently out of stock. You can still add to Draft, but Confirmation will fail.`);
      }
      setCart([
        ...cart,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unitPrice: Number(product.unitPrice),
          availableStock: product.currentStock,
          quantity: 1,
        },
      ]);
    }
  };

  const handleUpdateQty = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    const item = cart.find(i => i.productId === productId);
    if (item && quantity > item.availableStock) {
      alert(`Warning: Requested quantity (${quantity}) exceeds available stock (${item.availableStock})`);
    }
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.productId !== productId));
  };

  const calculateGrandTotal = () => {
    return cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);
  };

  const handleSubmitChallan = async (confirmImmediately: boolean) => {
    if (!selectedCustomerId) {
      alert('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      alert('Cart is empty. Add products to create Challan.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setDeficits([]);

    const itemsPayload = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    }));

    try {
      // 1. Create Draft
      const response = await api.post('/challans', {
        customerId: selectedCustomerId,
        items: itemsPayload,
      });

      if (response.data.success) {
        const createdChallan = response.data.data.challan;

        // 2. Optional direct confirmation
        if (confirmImmediately) {
          try {
            await api.post(`/challans/${createdChallan.id}/confirm`);
            alert(`Challan ${createdChallan.challanNumber} created and confirmed successfully!`);
            navigate('/challans');
          } catch (confirmErr: any) {
            if (confirmErr.response?.data?.errors) {
              setDeficits(confirmErr.response.data.errors);
              setErrorMsg(`Challan saved as DRAFT (${createdChallan.challanNumber}), but confirmation failed: ${confirmErr.response.data.message}`);
            } else {
              setErrorMsg(`Challan saved as DRAFT (${createdChallan.challanNumber}), but confirmation failed: ${confirmErr.response?.data?.message || 'Database error'}`);
            }
          }
        } else {
          alert(`Challan Draft ${createdChallan.challanNumber} saved successfully.`);
          navigate('/challans');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate Challan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div style={{ color: 'var(--text-secondary)' }}>Loading Challan Wizard...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back button */}
      <div>
        <button onClick={() => navigate('/challans')} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
          ← Back to Challan Ledger
        </button>
      </div>

      {errorMsg && (
        <div style={{ backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
          <span style={{ fontWeight: 700 }}>Alert:</span> {errorMsg}
          {deficits.length > 0 && (
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem' }}>
              {deficits.map((def, idx) => (
                <li key={idx}>
                  Product <strong>{def.name}</strong> (SKU: {def.sku}) - Requested: {def.requested}, Available: {def.available} units.
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Grid: Left customer & product selectors, Right cart panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', alignItems: 'start' }} className="wizard-layout">
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Customer Selection */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>👥 Step 1: Select Customer</h3>
            <div className="form-group">
              <label htmlFor="customerSelect">Active Customer Account *</label>
              <select
                id="customerSelect"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">-- Choose Customer --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.businessName} ({c.name})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Selection */}
          <div className="card">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>📦 Step 2: Add Products</h3>
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Search Product SKU / Name</label>
              <input
                type="text"
                placeholder="Search..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {searchedProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'var(--bg-tertiary)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      SKU: <code>{p.sku}</code> | Stock: <span style={{ color: p.currentStock <= p.minStockAlertQty ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>{p.currentStock} Units</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary-hover)' }}>₹ {Number(p.unitPrice).toFixed(2)}</div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      onClick={() => handleAddToCart(p)}
                    >
                      <AddIcon size={12} /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Cart overview panel */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'sticky', top: '90px' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            Cart Review
          </h3>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Your cart is empty. Add products from the catalog.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border-color)',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                        <code style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</code>
                      </div>
                      <button
                        onClick={() => handleRemoveFromCart(item.productId)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.2rem'
                        }}
                      >
                        <DeleteIcon size={16} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem' }}
                          onClick={() => handleUpdateQty(item.productId, item.quantity - 1)}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(item.productId, parseInt(e.target.value) || 1)}
                          style={{ width: '50px', textAlign: 'center', padding: '0.2rem' }}
                        />
                        <button
                          className="btn btn-secondary"
                          style={{ padding: '0.15rem 0.4rem', fontSize: '0.8rem' }}
                          onClick={() => handleUpdateQty(item.productId, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {item.quantity} x ₹ {item.unitPrice.toFixed(2)}
                        </div>
                        <div style={{ fontWeight: 700 }}>
                          ₹ {(item.quantity * item.unitPrice).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{
                borderTop: '1px solid var(--border-color)',
                paddingTop: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span style={{ fontWeight: 600 }}>Grand Total:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-hover)' }}>
                  ₹ {calculateGrandTotal().toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Wizard checkout actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubmitChallan(true)}
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                >
                  Save & Confirm (Deduct Inventory)
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleSubmitChallan(false)}
                  disabled={isSubmitting}
                  style={{ width: '100%' }}
                >
                  Save as Draft
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
