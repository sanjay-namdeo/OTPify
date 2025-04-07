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
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const loadTokens = () => {
      setLoading(true);
      
      // Using Promise then/catch instead of async/await to avoid React error #31
      getTokens()
        .then(storedTokens => {
          // Only update state if the component is still mounted
          if (isMounted) {
            setTokens(storedTokens || []);
            setLoading(false);
          }
        })
        .catch(error => {
          console.error('Error loading tokens in App component:', error);
          // Only update state if the component is still mounted
          if (isMounted) {
            setTokens([]);
            setLoading(false);
          }
        });
    };
    
    // Initial load
    loadTokens();
    
    // Listen for token refresh events
    const handleRefresh = () => {
      loadTokens();
    };
    
    window.addEventListener('refreshTokens', handleRefresh);
    
    // Cleanup function
    return () => {
      isMounted = false; // Prevent state updates after unmount
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
  
  const handleAddToken = (newToken) => {
    // Using Promise .then syntax instead of async/await to avoid React error #31
    // Update local state immediately for a responsive UI
    setTokens(prevTokens => [...prevTokens, newToken]);
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
