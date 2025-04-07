/**
 * Component for importing and exporting tokens
 * Provides secure backup and restore of token data
 */

const { useState } = React;

const ImportExport = ({ onClose, onImport }) => {
  const [mode, setMode] = useState('select'); // 'select', 'export', 'import'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [exportData, setExportData] = useState('');
  const [importData, setImportData] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset to initial state
  const resetState = () => {
    setPassword('');
    setConfirmPassword('');
    setExportData('');
    setImportData('');
    setMessage('');
    setError('');
    setLoading(false);
  };

  // Handle export action
  const handleExport = () => {
    // Validate password
    if (!password) {
      setError('Please enter a password to protect your backup.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    // Request token export from background script using Promise pattern
    browser.runtime.sendMessage({
      action: 'exportTokens',
      password: password
    })
    .then(response => {
      if (response.status === 'success') {
        setExportData(response.exportData);
        setMessage('Export successful! Copy the data below and store it securely.');
      } else {
        setError(response.message || 'Unknown error occurred during export.');
      }
    })
    .catch(error => {
      console.error('Error exporting tokens:', error);
      setError('Failed to export tokens. Please try again.');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Handle import action
  const handleImport = () => {
    // Validate inputs
    if (!importData) {
      setError('Please paste your backup data.');
      return;
    }

    if (!password) {
      setError('Please enter the password for this backup.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    // Send import data to background script using Promise pattern
    browser.runtime.sendMessage({
      action: 'importTokens',
      importData: importData.trim(),
      password: password
    })
    .then(response => {
      if (response.status === 'success') {
        setMessage(response.message || 'Tokens imported successfully!');
        
        // Clear form after successful import
        setImportData('');
        setPassword('');
        
        // Refresh token list
        if (onImport && typeof onImport === 'function') {
          onImport();
        }
      } else {
        setError(response.message || 'Unknown error occurred during import.');
      }
    })
    .catch(error => {
      console.error('Error importing tokens:', error);
      setError('Failed to import tokens. Please check your data and password.');
    })
    .finally(() => {
      setLoading(false);
    });
  };

  // Copy export data to clipboard
  const copyToClipboard = () => {
    const textarea = document.createElement('textarea');
    textarea.value = exportData;
    document.body.appendChild(textarea);
    textarea.select();
    
    try {
      document.execCommand('copy');
      setMessage('Data copied to clipboard!');
    } catch (err) {
      setError('Failed to copy data. Please select and copy manually.');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="import-export-container">
        <h2>Backup & Restore</h2>
        <p className="import-export-description">
          Securely backup your tokens or restore from a previous backup.
        </p>
        
        <div className="import-export-actions">
          <button 
            className="btn-primary" 
            onClick={() => { resetState(); setMode('export'); }}
          >
            Create Backup
          </button>
          <button 
            className="btn-secondary" 
            onClick={() => { resetState(); setMode('import'); }}
          >
            Restore Backup
          </button>
        </div>
        
        <button 
          className="btn-link" 
          onClick={onClose}
        >
          ← Back to Tokens
        </button>
      </div>
    );
  }

  // Export screen
  if (mode === 'export') {
    return (
      <div className="import-export-container">
        <h2>Create Backup</h2>
        
        {!exportData ? (
          <>
            <div className="form-group">
              <label htmlFor="exportPassword">Backup Password</label>
              <input
                type="password"
                id="exportPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
              />
              <small>This password will be used to encrypt your backup data.</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <div className="import-export-actions">
              <button 
                className="btn-secondary" 
                onClick={() => setMode('select')}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? 'Creating Backup...' : 'Create Backup'}
              </button>
            </div>
          </>
        ) : (
          <>
            {message && <div className="success-message">{message}</div>}
            
            <div className="form-group">
              <label htmlFor="exportData">Backup Data</label>
              <textarea
                id="exportData"
                value={exportData}
                readOnly
                rows={6}
              />
              <small>
                Store this data securely. You'll need it along with your password 
                to restore your tokens.
              </small>
            </div>
            
            <div className="import-export-actions">
              <button 
                className="btn-secondary" 
                onClick={() => { setExportData(''); setMode('select'); }}
              >
                Done
              </button>
              <button 
                className="btn-primary" 
                onClick={copyToClipboard}
              >
                Copy to Clipboard
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Import screen
  if (mode === 'import') {
    return (
      <div className="import-export-container">
        <h2>Restore Backup</h2>
        
        <div className="form-group">
          <label htmlFor="importData">Backup Data</label>
          <textarea
            id="importData"
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            placeholder="Paste your backup data here"
            rows={6}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="importPassword">Backup Password</label>
          <input
            type="password"
            id="importPassword"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter the backup password"
          />
        </div>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        
        <div className="import-export-actions">
          <button 
            className="btn-secondary" 
            onClick={() => setMode('select')}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            className="btn-primary" 
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? 'Restoring...' : 'Restore Tokens'}
          </button>
        </div>
      </div>
    );
  }
};

export default ImportExport;