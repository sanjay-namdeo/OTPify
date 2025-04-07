/**
 * OTPify - Bundled popup script
 * This file contains all of the components and utilities needed for the popup
 * to work without using ES modules which can cause issues in Firefox extensions.
 */

// ========== TokenCard Component ==========
function TokenCard({ token, onDelete }) {
  const [currentCode, setCurrentCode] = React.useState('');
  const [nextCode, setNextCode] = React.useState('');
  const [timeRemaining, setTimeRemaining] = React.useState(30);
  const [progressColor, setProgressColor] = React.useState('#4CAF50');
  
  // Update token code and progress every second
  React.useEffect(() => {
    function updateToken() {
      try {
        // For TOTP tokens
        if (token.type === 'TOTP') {
          // Calculate current time period
          const now = Math.floor(Date.now() / 1000);
          const seconds = now % 30;
          const currentPeriod = Math.floor(now / 30);
          const nextPeriod = currentPeriod + 1;
          
          // Create TOTP object for current and next period
          const totp = new OTPAuth.TOTP({
            issuer: token.issuer || '',
            label: token.account || '',
            algorithm: token.algorithm || 'SHA1',
            digits: token.digits || 6,
            period: 30,
            secret: OTPAuth.Secret.fromBase32(token.secret)
          });
          
          // Get codes and format them with a space in the middle
          let current = totp.generate({ timestamp: currentPeriod * 30 * 1000 });
          let next = totp.generate({ timestamp: nextPeriod * 30 * 1000 });
          
          if (current.length === 6) {
            current = `${current.substring(0, 3)} ${current.substring(3)}`;
          }
          
          if (next.length === 6) {
            next = `${next.substring(0, 3)} ${next.substring(3)}`;
          }
          
          setCurrentCode(current);
          setNextCode(next);
          
          // Update time remaining
          setTimeRemaining(30 - seconds);
          
          // Update progress bar color
          if (30 - seconds <= 10) {
            setProgressColor('#F44336'); // Red when 10 seconds or less remaining
          } else if (30 - seconds <= 20) {
            setProgressColor('#FFC107'); // Yellow when 20 seconds or less remaining
          } else {
            setProgressColor('#4CAF50'); // Green otherwise
          }
        } 
        // For RSA tokens
        else if (token.type === 'RSA') {
          const generator = new RSASecurID.TokenGenerator(token.secret);
          
          // Get current and next codes
          let current = generator.getTokenCode();
          let next = generator.getNextTokenCode();
          
          // Format with a space in the middle
          if (current.length === 6) {
            current = `${current.substring(0, 3)} ${current.substring(3)}`;
          }
          
          if (next.length === 6) {
            next = `${next.substring(0, 3)} ${next.substring(3)}`;
          }
          
          setCurrentCode(current);
          setNextCode(next);
          
          // RSA tokens typically refresh every 60 seconds
          const now = Math.floor(Date.now() / 1000);
          const seconds = now % 60;
          setTimeRemaining(60 - seconds);
          
          // Update progress bar color
          if (60 - seconds <= 15) {
            setProgressColor('#F44336'); // Red when 15 seconds or less remaining
          } else if (60 - seconds <= 30) {
            setProgressColor('#FFC107'); // Yellow when 30 seconds or less remaining
          } else {
            setProgressColor('#4CAF50'); // Green otherwise
          }
        }
      } catch (error) {
        console.error('Error updating token:', error);
      }
    }
    
    // Update right away and then every second
    updateToken();
    const interval = setInterval(updateToken, 1000);
    
    return () => clearInterval(interval);
  }, [token]);
  
  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete the token for ${token.name}?`)) {
      onDelete(token.id);
    }
  };
  
  const getProgressPercent = () => {
    if (token.type === 'TOTP') {
      return (timeRemaining / 30) * 100;
    } else {
      return (timeRemaining / 60) * 100;
    }
  };
  
  return React.createElement('div', { className: 'token-card' },
    React.createElement('div', { className: 'token-header' },
      React.createElement('h3', null, token.name),
      React.createElement('span', { className: 'token-type' }, token.type)
    ),
    React.createElement('div', { className: 'token-detail' },
      React.createElement('label', null, 'Account'),
      React.createElement('p', null, token.account)
    ),
    React.createElement('div', { className: 'token-detail' },
      React.createElement('label', null, 'Current Token'),
      React.createElement('p', { className: 'token-code' }, currentCode || '------')
    ),
    React.createElement('div', { className: 'token-detail' },
      React.createElement('label', null, 'Next Token'),
      React.createElement('p', { className: 'token-code' }, nextCode || '------')
    ),
    React.createElement('div', { className: 'progress-container' },
      React.createElement('div', { 
        className: 'progress-bar',
        style: {
          width: `${getProgressPercent()}%`,
          backgroundColor: progressColor
        }
      })
    ),
    React.createElement('div', { className: 'token-actions' },
      React.createElement('button', {
        className: 'delete-button',
        onClick: handleDelete
      }, 'Delete')
    )
  );
}

// ========== AddTokenForm Component ==========
function AddTokenForm({ onAdd, onCancel }) {
  const [name, setName] = React.useState('');
  const [account, setAccount] = React.useState('');
  const [secret, setSecret] = React.useState('');
  const [type, setType] = React.useState('TOTP');
  const [error, setError] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    
    if (!account.trim()) {
      setError('Account is required');
      return;
    }
    
    if (!secret.trim()) {
      setError('Secret is required');
      return;
    }
    
    // Validate the secret based on token type
    try {
      if (type === 'TOTP') {
        try {
          // Try to parse it as a Base32 secret
          OTPAuth.Secret.fromBase32(secret);
        } catch (error) {
          setError('Invalid TOTP secret. Must be a valid Base32 string.');
          return;
        }
      } else if (type === 'RSA') {
        // RSA secrets should be at least 16 characters
        if (secret.length < 16) {
          setError('Invalid RSA seed. Must be at least 16 characters.');
          return;
        }
      }
      
      // Create token object
      const newToken = {
        id: Date.now().toString(),
        name,
        account,
        secret,
        type,
        issuer: name,
        algorithm: 'SHA1',
        digits: 6
      };
      
      // Add token
      onAdd(newToken);
    } catch (error) {
      setError(`Error validating token: ${error.message}`);
    }
  };
  
  return React.createElement('div', { className: 'add-token-form' },
    React.createElement('h2', null, 'Add New Token'),
    
    error && React.createElement('div', { className: 'error-message' }, error),
    
    React.createElement('form', { onSubmit: handleSubmit },
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Token Type'),
        React.createElement('select', {
          value: type,
          onChange: (e) => setType(e.target.value)
        },
          React.createElement('option', { value: 'TOTP' }, 'TOTP (Google Auth, Microsoft Auth, etc.)'),
          React.createElement('option', { value: 'RSA' }, 'RSA SecurID')
        )
      ),
      
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Name'),
        React.createElement('input', {
          type: 'text',
          value: name,
          onChange: (e) => setName(e.target.value),
          placeholder: 'e.g. GitHub, Gmail'
        })
      ),
      
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Account'),
        React.createElement('input', {
          type: 'text',
          value: account,
          onChange: (e) => setAccount(e.target.value),
          placeholder: 'e.g. username or email'
        })
      ),
      
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, type === 'TOTP' ? 'Secret Key' : 'RSA Seed'),
        React.createElement('input', {
          type: 'text',
          value: secret,
          onChange: (e) => setSecret(e.target.value),
          placeholder: type === 'TOTP' ? 'JBSWY3DPEHPK3PXP' : 'f3d8f9a1c6e0b5d2'
        })
      ),
      
      React.createElement('div', { className: 'form-actions' },
        React.createElement('button', {
          type: 'button',
          className: 'cancel-button',
          onClick: onCancel
        }, 'Cancel'),
        React.createElement('button', {
          type: 'submit',
          className: 'submit-button'
        }, 'Add Token')
      )
    )
  );
}

// ========== App Component ==========
function App() {
  const [tokens, setTokens] = React.useState([]);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  
  // Load tokens when the app starts
  React.useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true);
        
        // Try to get tokens from sync storage first
        const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
        if (!storage) {
          throw new Error('Browser storage API not available');
        }
        
        const result = await storage.get('tokens');
        setTokens(result.tokens || []);
        setLoading(false);
      } catch (error) {
        console.error('Error loading tokens:', error);
        setError('Failed to load tokens. Please try restarting the extension.');
        setLoading(false);
      }
    }
    
    loadTokens();
    
    // Set up a listener for token refresh messages from the background script
    const handleMessage = (message) => {
      if (message && message.action === 'refreshTokens') {
        // Force a re-render of all token cards
        setTokens(currentTokens => [...currentTokens]);
      }
    };
    
    try {
      browserAPI.runtime.onMessage.addListener(handleMessage);
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
    
    return () => {
      try {
        browserAPI.runtime.onMessage.removeListener(handleMessage);
      } catch (error) {
        console.error('Error removing message listener:', error);
      }
    };
  }, []);
  
  // Save tokens to storage
  const saveTokens = async (updatedTokens) => {
    try {
      // Try to save to sync storage first
      const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
      if (!storage) {
        throw new Error('Browser storage API not available');
      }
      
      await storage.set({ tokens: updatedTokens });
    } catch (error) {
      console.error('Error saving tokens:', error);
      setError('Failed to save tokens. Please try again.');
    }
  };
  
  // Add a new token
  const handleAddToken = async (newToken) => {
    try {
      const updatedTokens = [...tokens, newToken];
      setTokens(updatedTokens);
      await saveTokens(updatedTokens);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding token:', error);
      setError('Failed to add token. Please try again.');
    }
  };
  
  // Delete a token
  const handleDeleteToken = async (tokenId) => {
    try {
      const updatedTokens = tokens.filter(token => token.id !== tokenId);
      setTokens(updatedTokens);
      await saveTokens(updatedTokens);
    } catch (error) {
      console.error('Error deleting token:', error);
      setError('Failed to delete token. Please try again.');
    }
  };
  
  // Ping background script to make sure it's running
  React.useEffect(() => {
    const pingBackgroundScript = async () => {
      try {
        const response = await browserAPI.runtime.sendMessage({ action: 'ping' });
        console.log('Background script response:', response);
      } catch (error) {
        console.log('Error pinging background script (this is normal if just starting up):', error);
      }
    };
    
    pingBackgroundScript();
  }, []);
  
  if (loading) {
    return React.createElement('div', { className: 'loading' }, 'Loading tokens...');
  }
  
  if (error) {
    return React.createElement('div', { className: 'error' }, error);
  }
  
  if (showAddForm) {
    return React.createElement(AddTokenForm, {
      onAdd: handleAddToken,
      onCancel: () => setShowAddForm(false)
    });
  }
  
  return React.createElement('div', { className: 'app-container' },
    React.createElement('div', { className: 'header' },
      React.createElement('div', { className: 'app-title' },
        React.createElement('svg', { 
          width: 24, 
          height: 24, 
          viewBox: '0 0 24 24', 
          fill: 'none', 
          xmlns: 'http://www.w3.org/2000/svg' 
        },
          React.createElement('rect', { 
            width: 24, 
            height: 24, 
            rx: 12, 
            fill: '#4CAF50' 
          }),
          React.createElement('circle', { 
            cx: 8, 
            cy: 12, 
            r: 2, 
            fill: '#000' 
          }),
          React.createElement('circle', { 
            cx: 12, 
            cy: 12, 
            r: 2, 
            fill: '#000' 
          }),
          React.createElement('circle', { 
            cx: 16, 
            cy: 12, 
            r: 2, 
            fill: '#000' 
          })
        ),
        React.createElement('h1', null, 'OTPify')
      ),
      React.createElement('button', {
        onClick: () => setShowAddForm(true)
      }, 'Add Token')
    ),
    
    React.createElement('div', { className: 'token-list' },
      tokens.length === 0 ?
      React.createElement('div', { className: 'empty-state' },
        React.createElement('p', null, 'No tokens added yet.'),
        React.createElement('p', null, 'Click "Add Token" to get started.')
      ) :
      tokens.map(token => 
        React.createElement(TokenCard, {
          key: token.id,
          token: token,
          onDelete: handleDeleteToken
        })
      )
    )
  );
}

// ========== Render the App ==========
document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  ReactDOM.render(React.createElement(App), root);
});
