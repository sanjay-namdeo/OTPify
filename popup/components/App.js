import TokenCard from './TokenCard.js';
import AddTokenForm from './AddTokenForm.js';
import Login from './Login.js';
import ImportExport from './ImportExport.js';
import { getTokens, saveToken, checkMasterPasswordExists } from '../utils/storageUtils.js';

const { useState, useEffect } = React;

const App = () => {
  const [tokens, setTokens] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [autoLockTime, setAutoLockTime] = useState(5); // 5 minutes default
  const [showImportExport, setShowImportExport] = useState(false);

  // Check if master password is set and load tokens if authenticated
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const init = () => {
      // Check if master password is set
      checkMasterPasswordExists()
        .then(exists => {
          if (isMounted) {
            if (!exists) {
              // First time setup needed
              setNeedsSetup(true);
              setLoading(false);
            } else {
              // Master password exists, but need to login
              setNeedsSetup(false);
              setLoading(false);
              
              // Check if we have an active session (from background script)
              browser.runtime.sendMessage({ action: 'checkSession' })
                .then(response => {
                  if (isMounted && response && response.status === 'success' && response.hasSession) {
                    setIsLoggedIn(true);
                    loadTokens();
                  }
                })
                .catch(error => {
                  console.error('Error checking session:', error);
                });
            }
          }
        })
        .catch(error => {
          console.error('Error checking master password existence:', error);
          if (isMounted) {
            setLoading(false);
            // Assume first time setup if we can't check
            setNeedsSetup(true);
          }
        });
    };
    
    init();
    
    // Listen for auto-lock events from background script
    const handleAutoLock = (message) => {
      if (message && message.action === 'autoLock') {
        if (isMounted) {
          setIsLoggedIn(false);
        }
      }
      return true;
    };
    
    // Listen for messages from background script
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.onMessage.addListener(handleAutoLock);
    }
    
    return () => {
      isMounted = false;
      if (typeof browser !== 'undefined' && browser.runtime) {
        browser.runtime.onMessage.removeListener(handleAutoLock);
      }
    };
  }, []);
  
  // Load tokens when logged in
  const loadTokens = () => {
    setLoading(true);
    
    // Using Promise then/catch instead of async/await to avoid React error #31
    getTokens()
      .then(storedTokens => {
        setTokens(storedTokens || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading tokens in App component:', error);
        setTokens([]);
        setLoading(false);
      });
  };
  
  // Setup refresh listener when logged in
  useEffect(() => {
    if (isLoggedIn) {
      // Listen for token refresh events
      const handleRefresh = () => {
        loadTokens();
      };
      
      window.addEventListener('refreshTokens', handleRefresh);
      
      // Reset auto-lock timer when user interacts with the popup
      const resetAutoLock = () => {
        if (typeof browser !== 'undefined' && browser.runtime) {
          browser.runtime.sendMessage({ action: 'resetAutoLock' })
            .catch(error => console.error('Error resetting auto-lock:', error));
        }
      };
      
      // Add event listeners for user activity
      const activityEvents = ['click', 'keypress', 'mousemove'];
      activityEvents.forEach(event => {
        window.addEventListener(event, resetAutoLock);
      });
      
      // Cleanup function
      return () => {
        window.removeEventListener('refreshTokens', handleRefresh);
        activityEvents.forEach(event => {
          window.removeEventListener(event, resetAutoLock);
        });
      };
    }
  }, [isLoggedIn]);
  
  // Brand icon component
  const BrandIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="12" fill="#4CAF50" />
      <circle cx="8" cy="12" r="2" fill="#000" />
      <circle cx="12" cy="12" r="2" fill="#000" />
      <circle cx="16" cy="12" r="2" fill="#000" />
    </svg>
  );
  
  const handleLogin = (success) => {
    if (success) {
      setIsLoggedIn(true);
      loadTokens();
    }
  };
  
  const handleLogout = () => {
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({ action: 'logout' })
        .then(() => {
          setIsLoggedIn(false);
          setTokens([]);
        })
        .catch(error => {
          console.error('Error logging out:', error);
        });
    } else {
      // Fallback if browser API isn't available
      setIsLoggedIn(false);
      setTokens([]);
    }
  };
  
  const handleAddToken = (newToken) => {
    // Using Promise .then syntax instead of async/await to avoid React error #31
    saveToken(newToken)
      .then(success => {
        if (success) {
          // Update local state for a responsive UI
          setTokens(prevTokens => [...prevTokens, newToken]);
          setShowAddForm(false);
        }
      })
      .catch(error => {
        console.error('Error saving token:', error);
      });
  };
  
  const updateAutoLockTime = (minutes) => {
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({ 
        action: 'updateAutoLockTime', 
        minutes: parseInt(minutes, 10) 
      })
      .then(response => {
        if (response && response.status === 'success') {
          setAutoLockTime(parseInt(minutes, 10));
          setShowSettings(false);
        }
      })
      .catch(error => {
        console.error('Error updating auto-lock time:', error);
      });
    } else {
      // Fallback if browser API isn't available (demo mode)
      setAutoLockTime(parseInt(minutes, 10));
      setShowSettings(false);
    }
  };
  
  // Settings component
  const Settings = () => (
    <div className="settings-container">
      <h2>Settings</h2>
      
      <div className="form-group">
        <label htmlFor="autoLock">Auto-lock after</label>
        <select 
          id="autoLock" 
          value={autoLockTime} 
          onChange={(e) => updateAutoLockTime(e.target.value)}
        >
          <option value="1">1 minute</option>
          <option value="5">5 minutes</option>
          <option value="10">10 minutes</option>
          <option value="30">30 minutes</option>
          <option value="60">1 hour</option>
        </select>
      </div>
      
      <div className="form-group">
        <label>Data Management</label>
        <button 
          className="import-export-button"
          onClick={() => {
            setShowSettings(false);
            setShowImportExport(true);
          }}
        >
          Import/Export Tokens
        </button>
        <small>
          Securely backup and restore your tokens
        </small>
      </div>
      
      <div className="settings-buttons">
        <button className="btn-secondary" onClick={() => setShowSettings(false)}>
          Cancel
        </button>
        <button className="btn-danger" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
  
  if (loading) {
    return (
      <div className="loading">
        <div className="loader"></div>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} isSetup={needsSetup} />;
  }
  
  return (
    <div className="app-container">
      <div className="header">
        <div className="app-title">
          <BrandIcon />
          <h1>OTPify</h1>
        </div>
        <div className="header-buttons">
          <button 
            className="btn-icon" 
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            ⚙️
          </button>
          <button onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : 'Add Token'}
          </button>
        </div>
      </div>
      
      {showSettings ? (
        <Settings />
      ) : showAddForm ? (
        <AddTokenForm onAddToken={handleAddToken} onCancel={() => setShowAddForm(false)} />
      ) : showImportExport ? (
        <ImportExport 
          onClose={() => setShowImportExport(false)} 
          onImport={loadTokens} 
        />
      ) : (
        <div className="token-list">
          {tokens.length === 0 ? (
            <div className="empty-state">
              <p>No tokens added yet.</p>
              <p>Click "Add Token" to get started.</p>
            </div>
          ) : (
            <>
              <div className="token-list-actions">
                {tokens.length > 0 && (
                  <button 
                    className="import-export-button-small"
                    onClick={() => setShowImportExport(true)}
                    title="Backup or restore your tokens"
                  >
                    Import/Export
                  </button>
                )}
              </div>
              {tokens.map((token, index) => (
                <TokenCard key={token.id || index} token={token} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default App;
