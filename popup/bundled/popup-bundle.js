/**
 * OTPify - Bundled popup script
 * This file contains all of the components and utilities needed for the popup
 * to work without using ES modules which can cause issues in Firefox extensions.
 */

// ========== MasterPasswordForm Component ==========
function MasterPasswordForm({ onVerify, isSetup }) {
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isSetup) {
      // Setting up a new master password
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return;
      }
      
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }
    
    onVerify(password);
  };
  
  return React.createElement('div', { className: 'master-password-form' },
    React.createElement('h2', null, isSetup ? 'Set Master Password' : 'Enter Master Password'),
    React.createElement('p', null, isSetup 
      ? 'Create a strong master password to encrypt and protect your tokens.' 
      : 'Enter your master password to unlock your tokens.'),
    
    error && React.createElement('div', { className: 'error-message' }, error),
    
    React.createElement('form', { onSubmit: handleSubmit },
      React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Master Password'),
        React.createElement('input', {
          type: 'password',
          value: password,
          onChange: (e) => setPassword(e.target.value),
          placeholder: 'Enter your master password'
        })
      ),
      
      isSetup && React.createElement('div', { className: 'form-group' },
        React.createElement('label', null, 'Confirm Password'),
        React.createElement('input', {
          type: 'password',
          value: confirmPassword,
          onChange: (e) => setConfirmPassword(e.target.value),
          placeholder: 'Confirm your master password'
        })
      ),
      
      React.createElement('button', {
        type: 'submit',
        className: 'submit-button'
      }, isSetup ? 'Create Password' : 'Unlock')
    )
  );
}

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
          try {
            // Use RSA-SecurID library if available, otherwise fallback to simulator
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
          } catch (error) {
            console.error('Error generating RSA token, falling back to simulator:', error);
            // Fallback to our simulator if library fails
            const fallbackGenerator = new RSASimulator(token.secret);
            
            // Get codes and format them
            let current = fallbackGenerator.getTokenCode();
            let next = fallbackGenerator.getNextTokenCode();
            
            if (current.length === 6) {
              current = `${current.substring(0, 3)} ${current.substring(3)}`;
            }
            
            if (next.length === 6) {
              next = `${next.substring(0, 3)} ${next.substring(3)}`;
            }
            
            setCurrentCode(current);
            setNextCode(next);
            
            const now = Math.floor(Date.now() / 1000);
            const seconds = now % 60;
            setTimeRemaining(60 - seconds);
            
            if (60 - seconds <= 15) {
              setProgressColor('#F44336');
            } else if (60 - seconds <= 30) {
              setProgressColor('#FFC107');
            } else {
              setProgressColor('#4CAF50');
            }
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
    React.createElement('div', { className: 'token-codes' },
      React.createElement('div', { className: 'current-token' },
        React.createElement('label', null, 'Current'),
        React.createElement('p', { className: 'token-code' }, currentCode || '------')
      ),
      React.createElement('div', { className: 'next-token' },
        React.createElement('label', null, 'Next'),
        React.createElement('p', { className: 'token-code-next' }, nextCode || '------')
      )
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

// ========== Crypto Utilities ==========

// Key derivation function to get encryption key from master password
const deriveKey = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const saltData = encoder.encode(salt);
  
  // Import the password as a key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  
  // Derive a key for AES-GCM
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltData,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

// Encrypt data with the derived key
const encryptData = async (data, key) => {
  const encoder = new TextEncoder();
  const dataToEncrypt = encoder.encode(JSON.stringify(data));
  
  // Generate initialization vector
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    dataToEncrypt
  );
  
  // Convert encrypted data to a base64 string
  const encryptedArray = new Uint8Array(encryptedData);
  const ivString = Array.from(iv).map(b => String.fromCharCode(b)).join('');
  const encryptedString = Array.from(encryptedArray).map(b => String.fromCharCode(b)).join('');
  
  return {
    iv: btoa(ivString),
    encryptedData: btoa(encryptedString)
  };
};

// Decrypt data with the derived key
const decryptData = async (encryptedObj, key) => {
  try {
    // Convert base64 strings back to arrays
    const iv = Uint8Array.from(atob(encryptedObj.iv).split('').map(c => c.charCodeAt(0)));
    const encryptedData = Uint8Array.from(atob(encryptedObj.encryptedData).split('').map(c => c.charCodeAt(0)));
    
    // Decrypt the data
    const decryptedData = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      encryptedData
    );
    
    // Convert the decrypted data to a string and parse
    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Invalid master password or corrupted data');
  }
};

// Verify the master password
const verifyMasterPassword = async (password, salt, passwordHash) => {
  try {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    
    // Import the password as a key
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      passwordData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    );
    
    // Derive bits for verification
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      256
    );
    
    // Convert to a string for comparison
    const derivedHash = Array.from(new Uint8Array(derivedBits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return derivedHash === passwordHash;
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
};

// Create a password hash for verification
const createPasswordHash = async (password, salt) => {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  
  // Import the password as a key
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  // Derive bits for verification
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    256
  );
  
  // Convert to a string for storage
  return Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Generate a random salt
const generateSalt = () => {
  const saltArray = window.crypto.getRandomValues(new Uint8Array(16));
  return Array.from(saltArray)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// ========== App Component ==========
function App() {
  const [tokens, setTokens] = React.useState([]);
  const [encryptedTokens, setEncryptedTokens] = React.useState(null);
  const [showAddForm, setShowAddForm] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [masterPassword, setMasterPassword] = React.useState(null);
  const [isMasterPasswordSetup, setIsMasterPasswordSetup] = React.useState(false);
  const [encryptionKey, setEncryptionKey] = React.useState(null);
  const [salt, setSalt] = React.useState(null);
  const [passwordHash, setPasswordHash] = React.useState(null);
  
  const browserAPI = typeof browser !== 'undefined' ? browser : chrome;
  
  // Load tokens and check if master password is set up
  React.useEffect(() => {
    async function loadTokens() {
      try {
        setLoading(true);
        
        // Get the storage API
        const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
        if (!storage) {
          throw new Error('Browser storage API not available');
        }
        
        // Load the encryption metadata first
        const metaData = await storage.get(['salt', 'passwordHash', 'encryptedTokens']);
        
        if (!metaData.salt || !metaData.passwordHash) {
          // No master password has been set up yet
          setIsMasterPasswordSetup(false);
          setLoading(false);
          return;
        }
        
        // Master password is set up
        setSalt(metaData.salt);
        setPasswordHash(metaData.passwordHash);
        setEncryptedTokens(metaData.encryptedTokens || null);
        setIsMasterPasswordSetup(true);
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
  
  // Handle master password verification or setup
  const handleMasterPassword = async (password) => {
    try {
      setLoading(true);
      
      if (!isMasterPasswordSetup) {
        // Setup new master password
        const newSalt = generateSalt();
        const newPasswordHash = await createPasswordHash(password, newSalt);
        const key = await deriveKey(password, newSalt);
        
        // Save the salt and password hash
        const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
        await storage.set({ 
          salt: newSalt, 
          passwordHash: newPasswordHash,
          encryptedTokens: null
        });
        
        setSalt(newSalt);
        setPasswordHash(newPasswordHash);
        setEncryptionKey(key);
        setMasterPassword(password);
        setIsMasterPasswordSetup(true);
        setTokens([]);
      } else {
        // Verify existing master password
        const isValid = await verifyMasterPassword(password, salt, passwordHash);
        
        if (!isValid) {
          setError('Invalid master password');
          setLoading(false);
          return;
        }
        
        // Derive the encryption key
        const key = await deriveKey(password, salt);
        setEncryptionKey(key);
        setMasterPassword(password);
        
        // Decrypt tokens if available
        if (encryptedTokens) {
          const decryptedTokens = await decryptData(encryptedTokens, key);
          setTokens(decryptedTokens);
        } else {
          setTokens([]);
        }
      }
      
      setError(null);
      setLoading(false);
    } catch (error) {
      console.error('Error with master password:', error);
      setError(error.message);
      setLoading(false);
    }
  };
  
  // Save tokens to storage (encrypted)
  const saveTokens = async (updatedTokens) => {
    try {
      if (!encryptionKey) {
        throw new Error('Encryption key not available');
      }
      
      // Get the storage API
      const storage = browserAPI?.storage?.sync || browserAPI?.storage?.local;
      if (!storage) {
        throw new Error('Browser storage API not available');
      }
      
      // Encrypt the tokens
      const encrypted = await encryptData(updatedTokens, encryptionKey);
      
      // Save the encrypted tokens
      await storage.set({ encryptedTokens: encrypted });
      setEncryptedTokens(encrypted);
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
  
  // Lock the app (clear master password and encryption key)
  const handleLock = () => {
    setMasterPassword(null);
    setEncryptionKey(null);
    setTokens([]);
  };
  
  if (loading) {
    return React.createElement('div', { className: 'loading' }, 'Loading...');
  }
  
  if (error) {
    return React.createElement('div', { className: 'error' }, error);
  }
  
  // Show master password form if not unlocked
  if (!masterPassword) {
    return React.createElement(MasterPasswordForm, {
      onVerify: handleMasterPassword,
      isSetup: !isMasterPasswordSetup
    });
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
      React.createElement('div', { className: 'header-actions' },
        React.createElement('button', {
          className: 'lock-button',
          onClick: handleLock,
          title: 'Lock'
        }, '🔒'),
        React.createElement('button', {
          onClick: () => setShowAddForm(true)
        }, 'Add Token')
      )
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

// ========== RSA Simulator (Fallback) ==========
class RSASimulator {
  constructor(seed) {
    this.seed = seed;
    this.algorithm = 'sha256';
  }
  
  /**
   * Generates a token code based on the seed and current time
   * @returns {string} 6-digit token
   */
  getTokenCode() {
    return this._generateCode(0);
  }
  
  /**
   * Generates the next token code based on the seed and next time period
   * @returns {string} 6-digit token
   */
  getNextTokenCode() {
    return this._generateCode(1);
  }
  
  /**
   * Internal method to generate a deterministic but "random-looking" code
   * based on seed and time offset
   * @param {number} offset - Time offset (0 for current period, 1 for next period)
   * @returns {string} 6-digit token
   */
  _generateCode(offset = 0) {
    // Get current 60-second period (RSA typically uses 60-second windows)
    const now = Math.floor(Date.now() / 1000);
    const period = Math.floor(now / 60) + offset;
    
    // Create a deterministic but "random-looking" value by combining seed and period
    let hash = 0;
    const input = `${this.seed}-${period}`;
    
    // Simple string hash algorithm
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Ensure positive value and take modulo 1000000 to get 6 digits
    hash = Math.abs(hash) % 1000000;
    
    // Pad with leading zeros if necessary
    return hash.toString().padStart(6, '0');
  }
}

// ========== Render the App ==========
document.addEventListener('DOMContentLoaded', function() {
  const root = document.getElementById('root');
  ReactDOM.render(React.createElement(App), root);
});
