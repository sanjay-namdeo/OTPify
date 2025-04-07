const { useState, useEffect } = React;

/**
 * Login component for master password protection
 * Handles both initial password setup and subsequent logins
 */
const Login = ({ onLogin, isSetup = false }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Clear error when inputs change
  useEffect(() => {
    if (error) {
      setError('');
    }
  }, [password, confirmPassword]);
  
  const handleSetupPassword = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }
    
    // Confirm passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    // Create a message to the background script using Promise chain instead of async/await
    browser.runtime.sendMessage({
      action: 'setupMasterPassword',
      password: password
    })
    .then(response => {
      if (response && response.status === 'success') {
        onLogin(true);
      } else {
        setError(response?.message || 'Failed to set up master password');
        setLoading(false);
      }
    })
    .catch(error => {
      setError('Error setting up master password. Please try again.');
      console.error('Setup password error:', error);
      setLoading(false);
    });
  };
  
  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Create a message to the background script using Promise chain instead of async/await
    browser.runtime.sendMessage({
      action: 'verifyMasterPassword',
      password: password
    })
    .then(response => {
      if (response && response.status === 'success') {
        onLogin(true);
      } else {
        setError('Incorrect password');
        setLoading(false);
      }
    })
    .catch(error => {
      setError('Error verifying password. Please try again.');
      console.error('Login error:', error);
      setLoading(false);
    });
  };
  
  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>{isSetup ? 'Setup Master Password' : 'Enter Master Password'}</h2>
          <p className="login-subtitle">
            {isSetup 
              ? 'Create a strong password to protect your tokens' 
              : 'Enter your master password to access your tokens'}
          </p>
        </div>
        
        <form onSubmit={isSetup ? handleSetupPassword : handleLogin}>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your master password"
              required
              autoFocus
            />
          </div>
          
          {isSetup && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your master password"
                required
              />
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="login-button" 
            disabled={loading || (!isSetup && !password) || (isSetup && (!password || !confirmPassword))}
          >
            {loading ? 'Processing...' : isSetup ? 'Create Password' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;