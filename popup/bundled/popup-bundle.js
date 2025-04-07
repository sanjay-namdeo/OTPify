// TokenCard Component
const TokenCard = (props) => {
  const { useState, useEffect } = React;
  const { token } = props;
  
  const [currentToken, setCurrentToken] = useState('');
  const [nextToken, setNextToken] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressColor, setProgressColor] = useState('#4CAF50'); // Green default
  
  useEffect(() => {
    const generateTokens = () => {
      try {
        if (!token) return;
        
        // Get current period (30-second window)
        const now = Math.floor(Date.now() / 1000);
        const period = Math.floor(now / 30);
        
        // Import the tokenUtils functions
        const remainingSeconds = 30 - (now % 30);
        const percent = (remainingSeconds / 30) * 100;
        
        // Generate current token
        let current;
        let next;
        
        if (token.type === 'TOTP') {
          // For TOTP, use the OTPAuth library
          try {
            const totp = new OTPAuth.TOTP({
              issuer: token.name,
              label: token.account,
              algorithm: 'SHA1',
              digits: 6,
              period: 30,
              secret: OTPAuth.Secret.fromBase32(token.secret)
            });
            
            current = totp.generate();
            
            // Generate next token (for next period)
            const nextPeriod = period + 1;
            const nextTimestamp = nextPeriod * 30 * 1000;
            next = totp.generate({ timestamp: nextTimestamp });
          } catch (error) {
            console.error('Error generating TOTP:', error);
            current = 'Error';
            next = 'Error';
          }
        } else if (token.type === 'RSA') {
          // For RSA, normally we'd use RSA-specific libraries
          // This is a simplified simulation
          try {
            if (typeof RSASecurID !== 'undefined' && typeof RSASecurID.TokenGenerator === 'function') {
              const rsaGenerator = new RSASecurID.TokenGenerator(token.secret);
              current = rsaGenerator.getTokenCode();
              next = rsaGenerator.getNextTokenCode();
            } else {
              throw new Error('RSA SecurID library not loaded');
            }
          } catch (error) {
            console.error('Error generating RSA token:', error);
            current = 'Error';
            next = 'Error';
          }
        }
        
        // Format tokens with a space in the middle (e.g., "123 456")
        if (current && current.length === 6) {
          current = `${current.substring(0, 3)} ${current.substring(3)}`;
        }
        
        if (next && next.length === 6) {
          next = `${next.substring(0, 3)} ${next.substring(3)}`;
        }
        
        setCurrentToken(current || '------');
        setNextToken(next || '------');
        setProgressPercent(percent);
        
        // Set color based on remaining time
        if (remainingSeconds > 20) {
          setProgressColor('#4CAF50'); // Green: plenty of time
        } else if (remainingSeconds > 10) {
          setProgressColor('#FFC107'); // Yellow: getting close
        } else {
          setProgressColor('#F44336'); // Red: about to expire
        }
      } catch (error) {
        console.error('Error generating token:', error);
        setCurrentToken('Error');
        setNextToken('Error');
      }
    };
    
    // Generate initial tokens
    generateTokens();
    
    // Set up interval to update tokens
    const intervalId = setInterval(generateTokens, 1000);
    
    // Clean up interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [token]);
  
  // Progress bar component
  const ProgressBar = () => {
    return (
      <div className="progress-container">
        <div 
          className="progress-bar" 
          style={{ 
            width: `${progressPercent}%`, 
            backgroundColor: progressColor 
          }} 
        />
      </div>
    );
  };
  
  return (
    <div className="token-card">
      <div className="token-header">
        <h3>{token.name || 'Unnamed Token'}</h3>
        <span className="token-type">{token.type || 'TOTP'}</span>
      </div>
      
      <div className="token-detail">
        <label>Account</label>
        <p>{token.account || 'No account'}</p>
      </div>
      
      <div className="token-detail">
        <label>Current Token</label>
        <p className="token-code">{currentToken}</p>
      </div>
      
      <div className="token-detail">
        <label>Next Token</label>
        <p className="token-code">{nextToken}</p>
      </div>
      
      <ProgressBar />
    </div>
  );
};

// AddTokenForm Component
const AddTokenForm = (props) => {
  const { useState } = React;
  
  const [name, setName] = useState('');
  const [account, setAccount] = useState('');
  const [secret, setSecret] = useState('');
  const [type, setType] = useState('TOTP');
  const [error, setError] = useState('');
  
  // Import saveToken function
  const saveToken = async (token) => {
    try {
      const tokens = await getTokens();
      const updatedTokens = [...tokens, { ...token, id: Date.now().toString() }];
      
      // Use the appropriate browser storage API
      if (typeof browser !== 'undefined') {
        await browser.storage.sync.set({ tokens: updatedTokens });
      } else if (typeof chrome !== 'undefined') {
        await chrome.storage.sync.set({ tokens: updatedTokens });
      } else {
        throw new Error('Browser storage API not available');
      }
      
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  };
  
  // Validate token secret
  const validateSecret = (type, secret) => {
    if (!secret) return false;
    
    if (type === 'TOTP') {
      // TOTP secrets are typically base32 encoded
      try {
        // Check if it's a valid base32 string (simple validation)
        return /^[A-Z2-7]+=*$/.test(secret.toUpperCase());
      } catch (error) {
        return false;
      }
    } else if (type === 'RSA') {
      // RSA seeds are typically hexadecimal
      return /^[0-9A-Fa-f]{16,}$/.test(secret);
    }
    
    return false;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!name || !account || !secret) {
      setError('All fields are required');
      return;
    }
    
    // Validate secret based on token type
    if (!validateSecret(type, secret)) {
      setError(`Invalid ${type} secret format`);
      return;
    }
    
    // Create token object
    const newToken = {
      name,
      account,
      secret: type === 'TOTP' ? secret.toUpperCase().replace(/\s/g, '') : secret,
      type
    };
    
    // Save token
    const saved = await saveToken(newToken);
    if (saved) {
      // If saved successfully, pass the token back to the parent component
      props.onAddToken(newToken);
    } else {
      setError('Failed to save token');
    }
  };
  
  return (
    <div className="add-token-form">
      <h2>Add New Token</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Work Email"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="account">Account</label>
          <input
            type="text"
            id="account"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="e.g., user@company.com"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="secret">Secret Key</label>
          <input
            type="password"
            id="secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter token secret"
          />
          <small>This is the secret key provided by the service</small>
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Token Type</label>
          <select 
            id="type" 
            value={type} 
            onChange={(e) => setType(e.target.value)}
          >
            <option value="TOTP">TOTP (Time-based)</option>
            <option value="RSA">RSA SecurID</option>
          </select>
        </div>
        
        <div className="form-actions">
          <button type="button" onClick={props.onCancel} className="cancel-button">
            Cancel
          </button>
          <button type="submit" className="submit-button">
            Save Token
          </button>
        </div>
      </form>
    </div>
  );
};

// Storage Utils
const getTokens = async () => {
  try {
    let result;
    
    // Use the appropriate browser storage API
    if (typeof browser !== 'undefined') {
      result = await browser.storage.sync.get('tokens');
    } else if (typeof chrome !== 'undefined') {
      result = await chrome.storage.sync.get('tokens');
    } else {
      throw new Error('Browser storage API not available');
    }
    
    return result.tokens || [];
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return [];
  }
};

const deleteToken = async (tokenId) => {
  try {
    const tokens = await getTokens();
    const updatedTokens = tokens.filter(token => token.id !== tokenId);
    
    // Use the appropriate browser storage API
    if (typeof browser !== 'undefined') {
      await browser.storage.sync.set({ tokens: updatedTokens });
    } else if (typeof chrome !== 'undefined') {
      await chrome.storage.sync.set({ tokens: updatedTokens });
    } else {
      throw new Error('Browser storage API not available');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting token:', error);
    return false;
  }
};

const updateToken = async (tokenId, updatedData) => {
  try {
    const tokens = await getTokens();
    const updatedTokens = tokens.map(token => 
      token.id === tokenId ? { ...token, ...updatedData } : token
    );
    
    // Use the appropriate browser storage API
    if (typeof browser !== 'undefined') {
      await browser.storage.sync.set({ tokens: updatedTokens });
    } else if (typeof chrome !== 'undefined') {
      await chrome.storage.sync.set({ tokens: updatedTokens });
    } else {
      throw new Error('Browser storage API not available');
    }
    
    return true;
  } catch (error) {
    console.error('Error updating token:', error);
    return false;
  }
};

// App Component
const App = () => {
  const { useState, useEffect } = React;
  
  const [tokens, setTokens] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load tokens from storage when component mounts
  useEffect(() => {
    const loadTokens = async () => {
      try {
        const storedTokens = await getTokens();
        setTokens(storedTokens || []);
        setError(null);
      } catch (e) {
        console.error('Error loading tokens:', e);
        setError('Could not load tokens');
      } finally {
        setLoading(false);
      }
    };
    
    loadTokens();
    
    // Listen for token refresh events
    const handleRefresh = () => {
      loadTokens();
    };
    
    try {
      window.addEventListener('refreshTokens', handleRefresh);
      
      return () => {
        window.removeEventListener('refreshTokens', handleRefresh);
      };
    } catch (e) {
      console.error('Error setting up refresh listener:', e);
    }
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
    try {
      setTokens([...tokens, newToken]);
      setShowAddForm(false);
      setError(null);
    } catch (e) {
      console.error('Error adding token:', e);
      setError('Could not add token');
    }
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
      
      {error && <div className="error-message">{error}</div>}
      
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

// Make sure React and ReactDOM are defined before initializing
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  
  if (!root) {
    console.error('Root element not found');
    document.body.innerHTML = '<div class="error-message">Error: Root element not found</div>';
    return;
  }
  
  // Check if the browser is in dark mode and apply theme
  try {
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-theme', isDarkMode);

    // Listen for changes in color scheme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
      document.body.classList.toggle('dark-theme', event.matches);
    });
  } catch (e) {
    console.warn('Could not detect color scheme:', e);
  }
  
  // Make sure React and ReactDOM are defined
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.error('React or ReactDOM is not defined');
    root.innerHTML = '<div class="error-message">Error: Could not load React libraries</div>';
    return;
  }
  
  try {
    ReactDOM.render(React.createElement(App), root);
  } catch (error) {
    console.error('Error rendering React app:', error);
    root.innerHTML = `<div class="error-message">Error: ${error.message}</div>`;
  }
});

// Listen for messages from the background script
try {
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "refreshTokens") {
        // Publish a custom event that the App component will listen for
        window.dispatchEvent(new CustomEvent('refreshTokens'));
        return true; // Indicates async response
      }
    });
  } else if (typeof chrome !== 'undefined') {
    // Fallback for Chrome
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === "refreshTokens") {
        window.dispatchEvent(new CustomEvent('refreshTokens'));
        sendResponse({success: true});
        return true; // Indicates async response
      }
    });
  } else {
    console.warn('Neither browser nor chrome runtime API available');
  }
} catch (error) {
  console.error('Error setting up message listener:', error);
}
