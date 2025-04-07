import { saveToken } from '../utils/storageUtils.js';

const { useState } = React;

const AddTokenForm = ({ onAddToken, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    account: '',
    type: 'TOTP',
    secret: '',
    notes: '',
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
    serialNumber: ''  // For RSA tokens
  });
  
  const [error, setError] = useState('');
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name || !formData.account || !formData.secret) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      // Create token object
      const newToken = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };
      
      // Save token to secure storage
      await saveToken(newToken);
      
      // Notify parent component
      onAddToken(newToken);
      
    } catch (err) {
      setError(`Failed to save token: ${err.message}`);
    }
  };
  
  return (
    <div className="card">
      <h2>Add New Token</h2>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Name (required)</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Work Email"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="account">Account (required)</label>
          <input
            type="text"
            id="account"
            name="account"
            value={formData.account}
            onChange={handleChange}
            placeholder="user@example.com"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="type">Token Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
          >
            <option value="TOTP">TOTP</option>
            <option value="RSA">RSA</option>
          </select>
        </div>
        
        <div className="form-group">
          <label htmlFor="secret">Secret Key (required)</label>
          <input
            type="text"
            id="secret"
            name="secret"
            value={formData.secret}
            onChange={handleChange}
            placeholder={formData.type === 'TOTP' ? 'JBSWY3DPEHPK3PXP' : '200187896204650430065577665233760455407413523131257421666170563270014766671667535'}
            required
          />
        </div>
        
        {formData.type === 'RSA' && (
          <div className="form-group">
            <label htmlFor="serialNumber">Serial Number</label>
            <input
              type="text"
              id="serialNumber"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="B8007363"
            />
          </div>
        )}
        
        {formData.type === 'TOTP' && (
          <>
            <div className="form-group">
              <label htmlFor="algorithm">Algorithm</label>
              <select
                id="algorithm"
                name="algorithm"
                value={formData.algorithm}
                onChange={handleChange}
              >
                <option value="SHA1">SHA1</option>
                <option value="SHA256">SHA256</option>
                <option value="SHA512">SHA512</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="digits">Digits</label>
              <select
                id="digits"
                name="digits"
                value={formData.digits}
                onChange={handleChange}
              >
                <option value="6">6</option>
                <option value="8">8</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="period">Period (seconds)</label>
              <select
                id="period"
                name="period"
                value={formData.period}
                onChange={handleChange}
              >
                <option value="30">30</option>
                <option value="60">60</option>
              </select>
            </div>
          </>
        )}
        
        <div className="form-group">
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            placeholder="Additional information..."
            rows="3"
          ></textarea>
        </div>
        
        <div className="actions">
          <button type="button" className="button-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit">
            Save Token
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTokenForm;
