import TokenCard from './TokenCard.js';
import AddTokenForm from './AddTokenForm.js';
import { getTokens } from '../utils/storageUtils.js';

const { useState, useEffect } = React;

const App = () => {
  const [tokens, setTokens] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load tokens from storage when component mounts
  useEffect(() => {
    const loadTokens = async () => {
      const storedTokens = await getTokens();
      setTokens(storedTokens || []);
      setLoading(false);
    };
    
    loadTokens();
    
    // Listen for token refresh events
    const handleRefresh = () => {
      loadTokens();
    };
    
    window.addEventListener('refreshTokens', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshTokens', handleRefresh);
    };
  }, []);
  
  // Brand icon component
  const BrandIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="12" fill="#4CAF50" />
      <circle cx="8" cy="12" r="2" fill="#000" />
      <circle cx="12" cy="12" r="2" fill="#000" />
      <circle cx="16" cy="12" r="2" fill="#000" />
    </svg>
  );
  
  const handleAddToken = async (newToken) => {
    setTokens([...tokens, newToken]);
    setShowAddForm(false);
  };
  
  if (loading) {
    return (
      <div className="loading">
        <p>Loading tokens...</p>
      </div>
    );
  }
  
  return (
    <div className="app-container">
      <div className="header">
        <div className="app-title">
          <BrandIcon />
          <h1>OTPify</h1>
        </div>
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? 'Cancel' : 'Add Token'}
        </button>
      </div>
      
      {showAddForm ? (
        <AddTokenForm onAddToken={handleAddToken} onCancel={() => setShowAddForm(false)} />
      ) : (
        <div className="token-list">
          {tokens.length === 0 ? (
            <div className="empty-state">
              <p>No tokens added yet.</p>
              <p>Click "Add Token" to get started.</p>
            </div>
          ) : (
            tokens.map((token, index) => (
              <TokenCard key={token.id || index} token={token} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default App;
