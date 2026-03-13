import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import {
  Receipt,
  Users,
  Building2,
  LogOut,
  Plus,
  Download,
  LayoutDashboard,
  FileText,
  Package,
  Edit,
  Trash2,
  ShieldCheck
} from 'lucide-react';
import { useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

// --- API Service ---
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
const API = axios.create({
  baseURL: API_BASE_URL,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// --- Components ---
const Sidebar = () => {
  const navigate = useNavigate();
  const userRole = JSON.parse(localStorage.getItem('user') || '{}').role;
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="sidebar glass" style={{ width: '280px', height: '100vh', padding: '2rem', position: 'fixed' }}>
      <div className="logo" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '3rem' }}>
        <div style={{ background: 'var(--secondary)', padding: '0.5rem', borderRadius: '0.5rem' }}>
          <Receipt size={24} color="white" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Accounto</h2>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <SidebarLink to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <SidebarLink to="/invoices" icon={<Receipt size={20} />} label="Invoice List" />
        <SidebarLink to="/companies" icon={<Building2 size={20} />} label="Company Master" />
        <SidebarLink to="/customers" icon={<Users size={20} />} label="Customer Master" />
        <SidebarLink to="/items" icon={<Package size={20} />} label="Item Master" />
        {userRole === 'admin' && (
          <SidebarLink to="/users" icon={<ShieldCheck size={20} />} label="User Management" />
        )}
      </nav>

      <button className="btn" onClick={handleLogout} style={{ marginTop: 'auto', width: '100%', justifyContent: 'flex-start', color: '#ef4444' }}>
        <LogOut size={20} /> Logout
      </button>
    </div>
  );
};

const SidebarLink = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div className="nav-item" style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.75rem 1rem',
        borderRadius: '0.5rem',
        color: isActive ? 'white' : 'var(--text-muted)',
        background: isActive ? 'var(--primary)' : 'transparent',
        transition: 'all 0.2s'
      }}>
        {icon} {label}
      </div>
    </Link>
  );
};

// --- Pages ---
const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log('Attempting login with:', { username, password });
    setError('');
    try {
      const { data } = await API.post('/login', { username, password });
      console.log('Login success, token received');
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      const errorMsg = err.response?.data || err.message || 'Login failed';
      setError(errorMsg);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--primary)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card shadow"
        style={{ width: '100%', maxWidth: '400px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-muted)' }}>Log in to access your billing dashboard</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label>Username</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && (
            <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>
              {typeof error === 'object' ? error.message || JSON.stringify(error) : error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Login</button>
        </form>
      </motion.div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = localStorage.getItem('user');
  if (!token || !user) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const userRole = JSON.parse(localStorage.getItem('user') || '{}').role;
  if (!token) return <Navigate to="/login" />;
  if (userRole !== 'admin') return <Navigate to="/" />;
  return children;
};

const Dashboard = () => {
  return (
    <div className="page" style={{ padding: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)' }}>Welcome to Accounto Billing Software.</p>
      </header>
      <div className="card shadow" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Overview</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Manage your billing operations quickly via these shortcuts.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <Link to="/invoices/new"><button className="btn btn-primary"><Plus size={20} /> Create Invoice</button></Link>
          <Link to="/invoices"><button className="btn" style={{ background: '#f1f5f9' }}><Receipt size={20} /> View Invoices</button></Link>
        </div>
      </div>
    </div>
  );
};

const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const userRole = JSON.parse(localStorage.getItem('user') || '{}').role;

  const fetchInvoices = () => {
    API.get('/invoices').then(res => setInvoices(res.data)).catch(() => { });
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async (inv) => {
    if (!confirm(`Delete invoice "${inv.billNo}"?`)) return;
    try {
      await API.delete(`/invoices/${inv.id}`);
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete invoice');
    }
  };

  return (
    <div className="page" style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700 }}>Invoices</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your recent billing activities</p>
        </div>
        <Link to="/invoices/new">
          <button className="btn btn-primary"><Plus size={20} /> New Invoice</button>
        </Link>
      </header>

      <div className="card shadow" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Bill Details</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Customer</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'right' }}>Total Amount</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No invoices found. Create your first one!</td>
              </tr>
            )}
            {invoices.map(inv => (
              <tr key={inv.id} className="invoice-row" style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s', cursor: 'pointer' }}>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '1rem' }}>{inv.billNo}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{inv.billDate || new Date(inv.createdAt).toLocaleDateString()}</div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)' }}>{inv.customer.name}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {inv.customer.address}
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>₹{inv.totalAmount.toLocaleString()}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '0.25rem' }}>Paid</div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <Link to={`/invoices/edit/${inv.id}`}>
                      <button className="btn" style={{ padding: '0.6rem 1rem', background: 'white', border: '1px solid #e2e8f0', color: 'var(--text)' }} title="Edit Invoice">
                        <Edit size={16} /> Edit
                      </button>
                    </Link>
                    <button className="btn btn-primary" style={{ padding: '0.6rem 1rem' }} title="Download PDF" onClick={() => window.open(`${API_BASE_URL}/invoices/${inv.id}/download`, '_blank')}>
                      <Download size={16} /> PDF
                    </button>
                    {userRole === 'admin' && (
                      <button className="btn" onClick={() => handleDelete(inv)} style={{ padding: '0.6rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444' }} title="Delete Invoice">
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- Main App Component ---
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <div style={{ display: 'flex' }}>
              <Sidebar />
              <main style={{ marginLeft: '280px', width: 'calc(100% - 280px)', minHeight: '100vh' }}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/invoices" element={<InvoiceList />} />
                  <Route path="/invoices/new" element={<InvoiceForm />} />
                  <Route path="/invoices/edit/:id" element={<InvoiceForm />} />
                  <Route path="/companies" element={<CompanySettings />} />
                  <Route path="/customers" element={<MasterPage type="Customer" />} />
                  <Route path="/items" element={<MasterPage type="Item" />} />
                  <Route path="/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

// MasterPage and InvoiceForm components (stubs for now, will implement next)
const MasterPage = ({ type }) => {
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ name: '', address: '', gstin: '', sacCode: '', price: '', description: '', taxPercentage: '' });
  const userRole = JSON.parse(localStorage.getItem('user') || '{}').role;

  useEffect(() => {
    fetchItems();
  }, [type]);

  const fetchItems = () => {
    const endpoint = type === 'Company' ? '/companies' : type === 'Customer' ? '/customers' : '/items';
    API.get(endpoint).then(res => setItems(res.data)).catch(() => { });
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    try {
      await API.delete(`/items/${item.id}`);
      fetchItems();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      address: item.address || '',
      gstin: item.gstin || '',
      sacCode: item.sacCode || '',
      price: item.price || '',
      description: item.description || '',
      taxPercentage: item.taxPercentage || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = type === 'Company' ? '/companies' : type === 'Customer' ? '/customers' : '/items';

    // Convert price to number if it's an Item
    const submitData = { ...formData };
    if (type === 'Item') {
      submitData.price = parseFloat(submitData.price) || 0;
      submitData.taxPercentage = parseFloat(submitData.taxPercentage) || 0;
    }

    try {
      if (editingItem) {
        await API.put(`${endpoint}/${editingItem.id}`, submitData);
      } else {
        await API.post(endpoint, submitData);
      }
      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: '', address: '', gstin: '', sacCode: '', price: '', description: '', taxPercentage: '' });
      fetchItems();
    } catch (err) {
      alert('Operation failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700 }}>{type} Master</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your {type.toLowerCase()} records</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingItem(null);
          setFormData({ name: '', address: '', gstin: '', sacCode: '', price: '', description: '', taxPercentage: '' });
          setShowForm(true);
        }}>
          <Plus size={20} /> Add {type}
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card shadow" style={{ marginBottom: '2rem' }}>
          <h3>{editingItem ? 'Edit' : 'Add'} {type}</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="input-group">
              <label>{type === 'Item' ? 'Item Name' : 'Name'}</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            {type !== 'Item' && (
              <>
                <div className="input-group">
                  <label>Address</label>
                  <textarea
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minHeight: '100px' }}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    required={type !== 'Item'}
                  />
                </div>
                <div className="input-group">
                  <label>GSTIN</label>
                  <input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} />
                </div>
              </>
            )}
            {type === 'Item' && (
              <>
                <div className="input-group">
                  <label>HSN/SAC Code</label>
                  <input type="text" value={formData.sacCode} onChange={e => setFormData({ ...formData, sacCode: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Price (₹)</label>
                  <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Tax Percentage (%)</label>
                  <input type="number" step="0.01" value={formData.taxPercentage} onChange={e => setFormData({ ...formData, taxPercentage: e.target.value })} required />
                </div>
                <div className="input-group">
                  <label>Description</label>
                  <textarea
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minHeight: '100px' }}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </>
            )}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">Save Changes</button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="card shadow" style={{ padding: 0, overflow: 'hidden' }}>
        {items.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No {type.toLowerCase()}s found.</div>
        ) : (
          items.map(item => (
            <div key={item.id} style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong style={{ fontSize: '1.1rem', display: 'block' }}>{item.name}</strong>
                {type === 'Item' ? (
                  <>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{item.description}</p>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--secondary)', fontWeight: 600 }}>HSN/SAC: {item.sacCode}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600 }}>Price: ₹{item.price}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tax: {item.taxPercentage}%</span>
                    </div>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem', maxWidth: '500px' }}>{item.address}</p>
                    {item.gstin && <p style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600, marginTop: '0.5rem' }}>GSTIN: {item.gstin}</p>}
                  </>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn" onClick={() => handleEdit(item)} style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>Edit</button>
                {type === 'Item' && userRole === 'admin' && (
                  <button className="btn" onClick={() => handleDeleteItem(item)} style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444' }}>Delete</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Company Settings (Single Company) ---
const CompanySettings = () => {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', address: '', gstin: '', phone: '', mobile: '', email: '', signatory: '',
    bank: { bankName: '', accountNo: '', ifsc: '' },
    logo: null,
    signature: null
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [signaturePreview, setSignaturePreview] = useState(null);

  useEffect(() => {
    API.get('/companies').then(res => {
      if (res.data.length > 0) {
        const c = res.data[0];
        setCompany(c);
        setFormData({
          name: c.name || '', address: c.address || '', gstin: c.gstin || '',
          phone: c.phone || '', mobile: c.mobile || '', email: c.email || '',
          signatory: c.signatory || '',
          bank: c.bank || { bankName: '', accountNo: '', ifsc: '' },
          logo: c.logo || null,
          signature: c.signature || null
        });
        if (c.logo) setLogoPreview(c.logo);
        if (c.signature) setSignaturePreview(c.signature);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleBankChange = (field, value) => {
    setFormData({ ...formData, bank: { ...formData.bank, [field]: value } });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setLogoPreview(base64);
      setFormData(prev => ({ ...prev, logo: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo: null }));
  };

  const handleSignatureChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setSignaturePreview(base64);
      setFormData(prev => ({ ...prev, signature: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setSignaturePreview(null);
    setFormData(prev => ({ ...prev, signature: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (company) {
        const res = await API.put(`/companies/${company.id}`, formData);
        setCompany(res.data);
      } else {
        const res = await API.post('/companies', formData);
        setCompany(res.data);
      }
      alert('Company details saved successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-muted)' }}>Loading...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontWeight: 700 }}>Company Settings</h1>
        <p style={{ color: 'var(--text-muted)' }}>Your company details used on all invoices</p>
      </header>

      <form onSubmit={handleSubmit}>
        <div className="card shadow" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Basic Information</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1.5rem' }}>
            <div className="input-group">
              <label>Company Name</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>GSTIN</label>
              <input type="text" value={formData.gstin} onChange={e => setFormData({ ...formData, gstin: e.target.value })} />
            </div>
          </div>
          <div className="input-group">
            <label>Address</label>
            <textarea
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', minHeight: '80px' }}
              value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} required
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1.5rem' }}>
            <div className="input-group">
              <label>Phone</label>
              <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Mobile</label>
              <input type="text" value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Authorized Signatory</label>
            <input type="text" value={formData.signatory} onChange={e => setFormData({ ...formData, signatory: e.target.value })} />
          </div>
        </div>

        <div className="card shadow" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Company Logo</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {logoPreview ? (
              <div style={{ position: 'relative' }}>
                <img src={logoPreview} alt="Company Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '4px' }} />
                <button type="button" onClick={handleRemoveLogo} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', lineHeight: '22px', textAlign: 'center' }}>✕</button>
              </div>
            ) : (
              <div style={{ width: '100px', height: '100px', border: '2px dashed #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Logo</div>
            )}
            <div>
              <label style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
                <input type="file" accept="image/*" onChange={handleLogoChange} style={{ display: 'none' }} />
              </label>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PNG, JPG or SVG. Will appear on invoices.</p>
            </div>
          </div>
        </div>

        <div className="card shadow" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Bank Details</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 1.5rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Bank Name</label>
              <input type="text" value={formData.bank?.bankName || ''} onChange={e => handleBankChange('bankName', e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Account Number</label>
              <input type="text" value={formData.bank?.accountNo || ''} onChange={e => handleBankChange('accountNo', e.target.value)} />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>IFSC Code</label>
              <input type="text" value={formData.bank?.ifsc || ''} onChange={e => handleBankChange('ifsc', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="card shadow" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Digital Signature</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {signaturePreview ? (
              <div style={{ position: 'relative' }}>
                <img src={signaturePreview} alt="Digital Signature" style={{ width: '180px', height: '80px', objectFit: 'contain', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '4px', background: '#fff' }} />
                <button type="button" onClick={handleRemoveSignature} style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '22px', height: '22px', cursor: 'pointer', fontSize: '12px', lineHeight: '22px', textAlign: 'center' }}>✕</button>
              </div>
            ) : (
              <div style={{ width: '180px', height: '80px', border: '2px dashed #e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>No Signature</div>
            )}
            <div>
              <label style={{ display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                {signaturePreview ? 'Change Signature' : 'Upload Signature'}
                <input type="file" accept="image/*" onChange={handleSignatureChange} style={{ display: 'none' }} />
              </label>
              <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>PNG or JPG. Will appear on invoices.</p>
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '0.875rem 2.5rem', fontSize: '1.05rem' }}>
          {saving ? 'Saving...' : 'Save Company Details'}
        </button>
      </form>
    </div>
  );
};

const InvoiceForm = () => {
  const { id } = useParams();
  const isEditMode = !!id;

  const [companies, setCompanies] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [masterItems, setMasterItems] = useState([]);

  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [billNo, setBillNo] = useState('');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);

  // Dynamic Items State
  const [invoiceItems, setInvoiceItems] = useState([
    { description: '', itemDescription: '', sacCode: '', amount: 0, taxPercentage: 0 }
  ]);

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch Master Data
    Promise.all([
      API.get('/companies'),
      API.get('/customers'),
      API.get('/items')
    ]).then(([compRes, custRes, itemRes]) => {
      setCompanies(compRes.data);
      setCustomers(custRes.data);
      setMasterItems(itemRes.data);

      // Setup Defaults if not in edit mode
      if (!isEditMode) {
        if (compRes.data.length > 0) setSelectedCompany(compRes.data[0]);
        if (custRes.data.length > 0) setSelectedCustomer(custRes.data[0]);
        setBillNo(`INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`);
      }
    });

    // Fetch existing invoice if in edit mode
    if (isEditMode) {
      API.get(`/invoices/${id}`).then(res => {
        const inv = res.data;
        setSelectedCompany(inv.vendor);
        setSelectedCustomer(inv.customer);
        setBillNo(inv.billNo);
        // Map saved items or fallback structure
        const loadedItems = inv.items.map(it => ({
          description: it.description,
          itemDescription: it.itemDescription || '',
          sacCode: it.sacCode || it.sac_code || '',
          amount: it.amount || 0,
          taxPercentage: it.taxPercentage || 0,
        }));
        setInvoiceItems(loadedItems);
        if (inv.billDate) {
          const parts = inv.billDate.split('/');
          if (parts.length === 3) setBillDate(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }).catch(() => alert('Failed to load invoice for editing.'));
    }
  }, [id, isEditMode]);

  const handleAddItem = () => {
    setInvoiceItems([...invoiceItems, { description: '', itemDescription: '', sacCode: '', amount: 0, taxPercentage: 0 }]);
  };

  const handleRemoveItem = (index) => {
    const newItems = invoiceItems.filter((_, i) => i !== index);
    setInvoiceItems(newItems.length ? newItems : [{ description: '', itemDescription: '', sacCode: '', amount: 0, taxPercentage: 0 }]);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceItems];
    newItems[index][field] = value;
    setInvoiceItems(newItems);
  };

  const handleSelectMasterItem = (index, masterItemId) => {
    if (!masterItemId) return;
    const selected = masterItems.find(m => m.id === parseInt(masterItemId));
    if (selected) {
      const newItems = [...invoiceItems];
      newItems[index] = {
        ...newItems[index],
        description: selected.name + (selected.description ? ` - ${selected.description}` : ''),
        sacCode: selected.sacCode,
        amount: selected.price,
        taxPercentage: selected.taxPercentage || 0,
      };
      setInvoiceItems(newItems);
    }
  };

  // Calculations
  const calculations = invoiceItems.reduce((acc, item) => {
    const baseTotal = parseFloat(item.amount) || 0;
    const taxRate = parseFloat(item.taxPercentage) || 0;

    // Split tax evenly between SGST and CGST
    const sgstAmount = baseTotal * ((taxRate / 2) / 100);
    const cgstAmount = baseTotal * ((taxRate / 2) / 100);

    acc.subTotal += baseTotal;
    acc.sgstTotal += sgstAmount;
    acc.cgstTotal += cgstAmount;
    return acc;
  }, { subTotal: 0, sgstTotal: 0, cgstTotal: 0 });

  const grandTotal = calculations.subTotal + calculations.sgstTotal + calculations.cgstTotal;

  // Number to Indian currency words converter
  function numberToWords(num) {
    const a = [ '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen' ];
    const b = [ '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety' ];
    if (num === 0) return 'Zero';
    if (typeof num !== 'number') num = parseInt(num);
    let str = '';
    function inWords(n, suffix) {
      if (n > 19) {
        str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '') + (suffix ? ' ' + suffix : '') + ' ';
      } else if (n > 0) {
        str += a[n] + (suffix ? ' ' + suffix : '') + ' ';
      }
    }
    let crore = Math.floor(num / 10000000);
    let lakh = Math.floor((num / 100000) % 100);
    let thousand = Math.floor((num / 1000) % 100);
    let hundred = Math.floor((num / 100) % 10);
    let rest = Math.floor(num % 100);
    if (crore) inWords(crore, 'Crore');
    if (lakh) inWords(lakh, 'Lakh');
    if (thousand) inWords(thousand, 'Thousand');
    if (hundred) str += a[hundred] + ' Hundred ';
    if (rest) str += (str !== '' ? 'and ' : '') + (rest < 20 ? a[rest] : b[Math.floor(rest / 10)] + (rest % 10 ? ' ' + a[rest % 10] : '')) + ' ';
    return 'Rupees ' + str.trim() + ' Only';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCompany || !selectedCustomer) return alert('Please select a company and customer.');
    setLoading(true);

    const data = {
      vendor: selectedCompany,
      customer: selectedCustomer,
      billNo,
      billDate: (() => { const [y,m,d] = billDate.split('-'); return `${d}/${m}/${y}`; })(),
      stateName: selectedCompany.address || "State", // Fallback
      placeOfSupply: selectedCustomer.address || "Place", // Fallback
      items: invoiceItems,
      // Aggregating taxes at the document level for the backend schema expectations
      sgstRate: invoiceItems.length > 0 ? (invoiceItems[0].taxPercentage / 2) || 0 : 0,
      sgstAmount: calculations.sgstTotal,
      cgstRate: invoiceItems.length > 0 ? (invoiceItems[0].taxPercentage / 2) || 0 : 0,
      cgstAmount: calculations.cgstTotal,
      totalAmount: grandTotal,
      amountInWords: numberToWords(grandTotal),
      bank: selectedCompany.bank
    };

    try {
      if (isEditMode) {
        await API.put(`/invoices/${id}`, data);
      } else {
        const res = await API.post('/invoices', data);
        window.open(`${API_BASE_URL}/invoices/${res.data.id}/download`, '_blank');
      }
      navigate('/invoices');
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'generate'} invoice`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.875rem' }}>{isEditMode ? 'Edit Invoice' : 'Create New Invoice'}</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>{isEditMode ? `Updating ${billNo}` : 'Generate a new billing entry'}</p>
        </div>
        <div style={{ background: 'white', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', fontWeight: 700, color: 'var(--secondary)', fontSize: '1.1rem', boxShadow: 'var(--shadow)' }}>
          {billNo || 'Draft'}
        </div>
      </header>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

        {/* Header Details Card */}
        <div className="card shadow" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Billing Details</h3>
          {selectedCompany && (
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '0.25rem' }}>Company</div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{selectedCompany.name}</div>
              {selectedCompany.gstin && <div style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>GSTIN: {selectedCompany.gstin}</div>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Select Customer (Client)</label>
              <select value={selectedCustomer?.id || ''} onChange={e => setSelectedCustomer(customers.find(c => c.id == e.target.value))}>
                <option value="">-- Select Customer --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Bill Number</label>
              <input type="text" value={billNo} onChange={e => setBillNo(e.target.value)} required />
            </div>
            <div className="input-group" style={{ marginBottom: 0 }}>
              <label>Bill Date</label>
              <input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Dynamic Items Card */}
        <div className="card shadow" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Line Items</h3>

          {invoiceItems.map((item, index) => (
            <motion.div
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              key={index}
              style={{ display: 'flex', gap: '0.75rem', alignItems: 'stretch', marginBottom: '1rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}
            >
              {/* Item Number */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '2rem', fontWeight: 700, color: 'var(--secondary)', fontSize: '1rem', background: 'white', borderRadius: '0.5rem', border: '1px solid #e2e8f0', padding: '0 0.5rem' }}>
                {index + 1}
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Row 1: Master select + Description */}
                <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '0.75rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Load from Master</label>
                    <select onChange={e => handleSelectMasterItem(index, e.target.value)} defaultValue="">
                      <option value="">-- Custom --</option>
                      {masterItems.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Description</label>
                    <input type="text" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} required />
                  </div>
                </div>
                {/* Item Description */}
                <div className="input-group" style={{ marginBottom: 0 }}>
                  <label>Item Description <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>(optional – shown in PDF)</span></label>
                  <input type="text" value={item.itemDescription} onChange={e => handleItemChange(index, 'itemDescription', e.target.value)} placeholder="e.g. Additional details, period, scope..." />
                </div>

                {/* Row 2: HSN/SAC, Rate, Tax */}
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr 120px', gap: '0.75rem' }}>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>HSN/SAC</label>
                    <input type="text" value={item.sacCode} onChange={e => handleItemChange(index, 'sacCode', e.target.value)} />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Rate (₹)</label>
                    <input type="number" step="0.01" value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} required />
                  </div>
                  <div className="input-group" style={{ marginBottom: 0 }}>
                    <label>Tax (%)</label>
                    <input type="number" step="0.01" value={item.taxPercentage} onChange={e => handleItemChange(index, 'taxPercentage', e.target.value)} required />
                  </div>
                </div>
              </div>

              <button type="button" onClick={() => handleRemoveItem(index)} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', height: '40px', width: '40px', flexShrink: 0 }} title="Remove Item">
                <Trash2 size={18} />
              </button>
            </motion.div>
          ))}

          <button type="button" onClick={handleAddItem} className="btn" style={{ background: '#f1f5f9', color: 'var(--primary)', fontWeight: 600, width: '100%', border: '1px dashed #cbd5e1' }}>
            <Plus size={18} /> Add Another Item
          </button>
        </div>

        {/* Calculations Summary Card */}
        <div className="card shadow" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', color: 'var(--primary)' }}>Payment Summary</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.5rem', alignItems: 'end' }}>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>Sub Total</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>₹{calculations.subTotal.toFixed(2)}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>SGST</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>₹{calculations.sgstTotal.toFixed(2)}</div>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 500 }}>CGST</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>₹{calculations.cgstTotal.toFixed(2)}</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--primary)', borderRadius: '0.75rem', color: 'white' }}>
              <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.5rem', fontWeight: 500 }}>Grand Total</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{grandTotal.toFixed(2)}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '0.875rem 2.5rem', fontSize: '1.05rem', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)' }}>
              {loading ? 'Processing...' : (isEditMode ? 'Save Invoice Changes' : 'Generate Invoice')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

// --- User Management Component (Admin only) ---
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState('');

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = () => {
    API.get('/users').then(res => setUsers(res.data)).catch(() => {});
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({ username: user.username, password: '', role: user.role });
    setError('');
    setShowForm(true);
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) return alert('Cannot delete your own account');
    if (!confirm(`Delete user "${user.username}"?`)) return;
    try {
      await API.delete(`/users/${user.id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingUser) {
        await API.put(`/users/${editingUser.id}`, formData);
      } else {
        if (!formData.password) {
          setError('Password is required for new users');
          return;
        }
        await API.post('/users', formData);
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ username: '', password: '', role: 'user' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontWeight: 700 }}>User Management</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage login credentials and user roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setEditingUser(null);
          setFormData({ username: '', password: '', role: 'user' });
          setError('');
          setShowForm(true);
        }}>
          <Plus size={20} /> Add User
        </button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="card shadow" style={{ marginBottom: '2rem' }}>
          <h3>{editingUser ? 'Edit' : 'Add'} User</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
            <div className="input-group">
              <label>Username</label>
              <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
            </div>
            <div className="input-group">
              <label>Password {editingUser && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>(leave blank to keep current)</span>}</label>
              <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
            </div>
            <div className="input-group">
              <label>Role</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {error && <p style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn btn-primary">
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
              <button type="button" className="btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="card shadow" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <tr>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>ID</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Username</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>Role</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr><td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No users found.</td></tr>
            )}
            {users.map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '1rem 1.5rem' }}>{user.id}</td>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>{user.username}</td>
                <td style={{ padding: '1rem 1.5rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    background: user.role === 'admin' ? '#dbeafe' : '#f1f5f9',
                    color: user.role === 'admin' ? '#1d4ed8' : '#64748b'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                    <button className="btn" onClick={() => handleEdit(user)} style={{ padding: '0.5rem 0.75rem', background: 'white', border: '1px solid #e2e8f0' }}>
                      <Edit size={16} /> Edit
                    </button>
                    {user.id !== currentUser.id && (
                      <button className="btn" onClick={() => handleDelete(user)} style={{ padding: '0.5rem 0.75rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#ef4444' }}>
                        <Trash2 size={16} /> Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default App;
