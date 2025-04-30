import { useState, useEffect, ChangeEvent, FormEvent } from 'react';

// Remove hardcoded credentials
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787";
const AUTH_API_BASE = "https://auth-api.mattmcarroll.workers.dev";

type Category = { name: string; hero: string; url: string };

const initialCategories: Category[] = [];

export default function AdminPortal() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [tagline, setTagline] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [newHero, setNewHero] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [error, setError] = useState('');
  const [taglineDraft, setTaglineDraft] = useState('');
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [showHeroReminder, setShowHeroReminder] = useState(false);
  const [lastHeroFilename, setLastHeroFilename] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = (): Record<string, string> => {
    const t = token || localStorage.getItem('adminToken');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  // Utility to merge headers safely
  const mergeHeaders = (base: Record<string, string>, extra: Record<string, string>) => {
    return { ...base, ...extra };
  };

  // Load protected data
  const loadProtectedData = async () => {
    try {
      const headers = getAuthHeaders();
      if (!headers.Authorization) {
        throw new Error('No auth token available');
      }

      // Fetch categories
      const catRes = await fetch(`${API_BASE}/categories`, {
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers)
      });
      if (!catRes.ok) throw new Error('Failed to fetch categories');
      const catData = await catRes.json() as Category[];
      setCategories(catData);
      setCategoriesLoaded(true);
      
      // Fetch announcement
      const annRes = await fetch(`${API_BASE}/announcement`, {
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers)
      });
      if (annRes.ok) {
        const annData = await annRes.text();
        const announcement = annData === 'null' ? '' : annData;
        setAnnouncement(announcement);
        setAnnouncementDraft(announcement);
      }

      // Fetch tagline
      const tagRes = await fetch(`${API_BASE}/tagline`, {
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers)
      });
      if (tagRes.ok) {
        const tagData = await tagRes.text();
        if (tagData && tagData !== 'null') {
          setTagline(tagData);
          setTaglineDraft(tagData);
        }
      }
    } catch (error) {
      console.error('Error loading protected data:', error);
      setError('Failed to load data');
      setLoggedIn(false);
      localStorage.removeItem('adminToken');
      setToken(null);
    }
  };

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('adminToken');
      if (!storedToken) {
        setLoggedIn(false);
        return;
      }

      try {
        // Verify token
        const verifyRes = await fetch(`${AUTH_API_BASE}/verify`, {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        });
        
        if (!verifyRes.ok) {
          throw new Error('Token verification failed');
        }

        setToken(storedToken);
        setLoggedIn(true);
        await loadProtectedData();
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('adminToken');
        setToken(null);
        setLoggedIn(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${AUTH_API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(data.error || 'Login failed');
      }
      
      const data = await res.json();
      if (!data.token) {
        throw new Error('No token received');
      }

      localStorage.setItem('adminToken', data.token);
      setToken(data.token);
      setLoggedIn(true);
      await loadProtectedData();
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Invalid credentials');
      setLoggedIn(false);
      localStorage.removeItem('adminToken');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTagline = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/tagline`, {
        method: 'POST',
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ tagline: taglineDraft })
      });
      
      if (!res.ok) {
        throw new Error('Failed to save tagline');
      }
      
      setTagline(taglineDraft);
    } catch (error) {
      console.error('Error saving tagline:', error);
      setError('Failed to save tagline');
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/announcement`, {
        method: 'POST',
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify({ announcement: announcementDraft })
      });
      
      if (!res.ok) {
        throw new Error('Failed to save announcement');
      }
      
      setAnnouncement(announcementDraft);
    } catch (error) {
      console.error('Error saving announcement:', error);
      setError('Failed to save announcement');
    }
  };

  const saveCategoriesToAPI = async (updatedCategories: Category[]) => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: mergeHeaders({ 'Content-Type': 'application/json' }, headers),
        body: JSON.stringify(updatedCategories)
      });
      
      if (!res.ok) {
        throw new Error('Failed to save categories');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      setError('Failed to save categories');
      throw error;
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory || !newUrl) return;
    
    let imageUrl = '';
    if (newHero) {
      // Always store relative URLs for images from our API
      imageUrl = newHero.startsWith('http') && !newHero.includes(API_BASE) 
        ? newHero  // Keep external URLs as is
        : newHero.replace(API_BASE, ''); // Store API URLs as relative paths
    } else {
      imageUrl = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='100%25' height='100%25' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23666' text-anchor='middle' dy='.3em'%3E${encodeURIComponent(newCategory)}%3C/text%3E%3C/svg%3E`;
    }
    
    const updatedCategories = [...categories, { 
      name: newCategory, 
      hero: imageUrl,
      url: newUrl 
    }];

    try {
      await saveCategoriesToAPI(updatedCategories);
      setCategories(updatedCategories);
      setNewCategory('');
      setNewHero('');
      setNewUrl('');
    } catch (error) {
      // Error already handled in saveCategoriesToAPI
    }
  };

  const handleEditCategory = (idx: number) => {
    setEditingIndex(idx);
    setNewCategory(categories[idx].name);
    setNewHero(categories[idx].hero);
    setNewUrl(categories[idx].url);
  };

  const handleSaveCategory = async () => {
    if (editingIndex === null) return;
    
    const updated = [...categories];
    const heroPath = newHero || `/hero-${sanitizeCategoryName(newCategory)}.png`;
    // Always store relative URLs for images from our API
    const imageUrl = heroPath.startsWith('http') && !heroPath.includes(API_BASE)
      ? heroPath  // Keep external URLs as is
      : heroPath.replace(API_BASE, ''); // Store API URLs as relative paths
    updated[editingIndex] = { name: newCategory, hero: imageUrl, url: newUrl };
    
    try {
      await saveCategoriesToAPI(updated);
      setCategories(updated);
      setEditingIndex(null);
      setNewCategory('');
      setNewHero('');
      setNewUrl('');
      setShowHeroReminder(false);
    } catch (error) {
      // Error already handled in saveCategoriesToAPI
    }
  };

  const handleDeleteCategory = async (idx: number) => {
    const updated = categories.filter((_, i) => i !== idx);
    try {
      await saveCategoriesToAPI(updated);
      setCategories(updated);
    } catch (error) {
      // Error already handled in saveCategoriesToAPI
    }
  };

  const sanitizeCategoryName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Image upload handler
  const handleHeroChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const sanitized = sanitizeCategoryName(newCategory || 'category');
      const heroFilename = `hero-${sanitized}.png`;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("key", heroFilename);
      const authHeaders = getAuthHeaders();
      const res = await fetch(`${API_BASE}/upload-image`, {
        method: "POST",
        headers: authHeaders,
        body: formData
      });
      const data = await res.json();
      setNewHero(data.url); // Use the returned Worker image URL
      setLastHeroFilename(heroFilename);
      setShowHeroReminder(false);
    }
  };

  if (!loggedIn) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(-45deg, #f9fafb, #f3f4f6, #e5e7eb, #f3f4f6)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 15s ease infinite'
      }}>
        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#1a2233',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>Admin Login</h1>
          
          {error && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="username" style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>Username</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
            
            <div>
              <label htmlFor="password" style={{
                display: 'block',
                marginBottom: '0.5rem',
                color: '#374151',
                fontSize: '0.875rem',
                fontWeight: 500
              }}>Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  fontSize: '1rem'
                }}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              style={{
                background: '#2563eb',
                color: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                border: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'opacity 0.2s'
              }}
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '3rem auto', padding: 32, background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px #e5e7eb' }}>
      <h2 style={{ fontWeight: 700, color: '#1a2233', marginBottom: 24 }}>Admin Dashboard</h2>
      <div style={{ marginBottom: 32, display: 'flex', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Company Tagline:</label>
          <input
            type="text"
            value={taglineDraft}
            onChange={e => setTaglineDraft(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
          />
          <button onClick={handleSaveTagline} style={{ marginBottom: 16, background: '#1a2233', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>Save Tagline</button>
          <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>Announcement (optional):</label>
          <input
            type="text"
            value={announcementDraft}
            onChange={e => setAnnouncementDraft(e.target.value)}
            style={{ width: '100%', marginBottom: 8, padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 15 }}
          />
          <button onClick={handleSaveAnnouncement} style={{ marginBottom: 16, background: '#1a2233', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>Save Announcement</button>
        </div>
      </div>
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontWeight: 600, color: '#1a2233', marginBottom: 16 }}>Manage TeePublic Categories</h3>
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
          {categories.map((cat, idx) => {
            // Convert relative URLs to absolute URLs if needed
            const imageUrl = cat.hero.startsWith('http') ? cat.hero : `${API_BASE}${cat.hero}`;
            
            return (
              <li key={cat.name + idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 16, background: '#f9fafb', borderRadius: 8, padding: 10 }}>
                <img src={imageUrl} alt={cat.name} style={{ width: 60, height: 40, objectFit: 'cover', borderRadius: 6, marginRight: 16, border: '1px solid #e5e7eb' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: '#1a2233' }}>{cat.name}</div>
                  <div style={{ fontSize: 13, color: '#888', wordBreak: 'break-all' }}>{cat.url}</div>
                </div>
                <button onClick={() => handleEditCategory(idx)} style={{ marginRight: 8, background: '#e5e7eb', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => handleDeleteCategory(idx)} style={{ color: '#fff', background: '#e53e3e', border: 'none', borderRadius: 6, padding: '6px 12px', fontWeight: 500, cursor: 'pointer' }}>Delete</button>
              </li>
            );
          })}
        </ul>
        <div style={{ marginTop: 32, background: '#f9fafb', borderRadius: 8, padding: 24, border: '1px solid #e5e7eb', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto' }}>
          <h4 style={{ fontWeight: 600, color: '#1a2233', marginBottom: 16 }}>{editingIndex !== null ? 'Edit Category' : 'Add Category'}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Category title"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, width: 160 }}
            />
            <input
              type="text"
              placeholder="Category URL (https://...)"
              value={newUrl}
              onChange={e => setNewUrl(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 15, width: 220 }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleHeroChange}
              style={{ padding: 4 }}
            />
            <button onClick={editingIndex !== null ? handleSaveCategory : handleAddCategory} style={{ background: '#1a2233', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15 }}>
              {editingIndex !== null ? 'Save' : 'Add'}
            </button>
            {editingIndex !== null && (
              <button onClick={() => { setEditingIndex(null); setNewCategory(''); setNewHero(''); setNewUrl(''); }} style={{ background: '#e5e7eb', color: '#1a2233', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 600, fontSize: 15, marginLeft: 4 }}>Cancel</button>
            )}
            {showHeroReminder && lastHeroFilename && (
              <div style={{ color: '#b7791f', background: '#fffbe6', border: '1px solid #f6e05e', borderRadius: 6, padding: '8px 12px', marginTop: 8, fontSize: 14 }}>
                Please manually move your uploaded image to the <b>public/</b> directory and rename it to <b>{lastHeroFilename}</b> for it to appear correctly.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 