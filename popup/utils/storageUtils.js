/**
 * Get storage API (supports both Firefox and Chrome)
 * @returns {Object} - The browser storage API
 */
const getStorage = () => {
  return browser?.storage?.sync || chrome?.storage?.sync;
};

/**
 * Checks if a master password has been set up
 * @returns {Promise<boolean>} - Whether a master password exists
 */
export const checkMasterPasswordExists = async () => {
  try {
    const storage = getStorage();
    
    if (!storage) {
      console.error('Browser storage API not available');
      return false;
    }
    
    // Handle both Promise-based (Firefox) and callback-based (Chrome) storage APIs
    if (typeof browser !== 'undefined') {
      // Firefox Promise-based implementation
      const result = await storage.get('passwordHash');
      return !!result.passwordHash;
    } else {
      // Chrome callback-based implementation
      return new Promise((resolve) => {
        storage.get('passwordHash', (result) => {
          if (chrome.runtime.lastError) {
            console.error('Error checking password existence:', chrome.runtime.lastError);
            resolve(false);
          } else {
            resolve(!!result.passwordHash);
          }
        });
      });
    }
  } catch (error) {
    console.error('Error checking password existence:', error);
    return false;
  }
};

/**
 * Securely saves a token using browser storage
 * @param {Object} token - The token to save
 * @returns {Promise<boolean>} - Whether the save was successful
 */
export const saveToken = async (token) => {
  try {
    // Get existing tokens
    const tokens = await getTokens();
    
    // Add new token with unique ID
    const newToken = {
      ...token,
      id: token.id || Date.now().toString()
    };
    
    tokens.push(newToken);
    
    // Since tokens are now encrypted in the background script,
    // we send a message to background script to save tokens
    const response = await browser.runtime.sendMessage({
      action: 'saveTokens',
      tokens: tokens
    });
    
    return response && response.status === 'success';
  } catch (error) {
    console.error('Error saving token:', error);
    return false;
  }
};

/**
 * Retrieves all tokens from storage
 * @returns {Promise<Array>} - The array of tokens
 */
export const getTokens = async () => {
  try {
    // Since tokens are now encrypted in the background script,
    // we need to get them through the background script
    if (typeof browser !== 'undefined' && browser.runtime) {
      const response = await browser.runtime.sendMessage({
        action: 'getTokens'
      });
      
      if (response && response.status === 'success') {
        return response.tokens || [];
      } else {
        console.error('Error retrieving tokens:', response?.message || 'Unknown error');
        return [];
      }
    } else {
      // Fallback to direct storage access when not in browser extension context
      const storage = getStorage();
      
      if (!storage) {
        console.error('Browser storage API not available');
        return [];
      }
      
      // Handle both Promise-based (Firefox) and callback-based (Chrome) storage APIs
      if (typeof browser !== 'undefined') {
        // Firefox Promise-based implementation
        try {
          const result = await storage.get('encryptedTokens');
          if (result.encryptedTokens) {
            console.warn('Encrypted tokens found but cannot decrypt in this context');
            return [];
          }
          
          // Try fallback to unencrypted tokens (for backward compatibility)
          const unencryptedResult = await storage.get('tokens');
          return unencryptedResult.tokens || [];
        } catch (error) {
          console.error('Error retrieving tokens from browser storage:', error);
          return [];
        }
      } else {
        // Chrome callback-based implementation
        return new Promise((resolve) => {
          storage.get(['encryptedTokens', 'tokens'], (result) => {
            if (chrome.runtime.lastError) {
              console.error('Error retrieving tokens:', chrome.runtime.lastError);
              resolve([]);
            } else if (result.encryptedTokens) {
              console.warn('Encrypted tokens found but cannot decrypt in this context');
              resolve([]);
            } else {
              resolve(result.tokens || []);
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Error retrieving tokens:', error);
    return [];
  }
};

/**
 * Deletes a token from storage
 * @param {string} tokenId - The ID of the token to delete
 * @returns {Promise<boolean>} - Whether the deletion was successful
 */
export const deleteToken = async (tokenId) => {
  try {
    // Get existing tokens
    const tokens = await getTokens();
    
    // Filter out the token to delete
    const updatedTokens = tokens.filter(token => token.id !== tokenId);
    
    // Since tokens are now encrypted in the background script,
    // we send a message to background script to save tokens
    const response = await browser.runtime.sendMessage({
      action: 'saveTokens',
      tokens: updatedTokens
    });
    
    // If successful, dispatch a refresh event
    if (response && response.status === 'success') {
      window.dispatchEvent(new CustomEvent('refreshTokens'));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error deleting token:', error);
    return false;
  }
};

/**
 * Updates an existing token
 * @param {string} tokenId - The ID of the token to update
 * @param {Object} updatedData - The updated token data
 * @returns {Promise<boolean>} - Whether the update was successful
 */
export const updateToken = async (tokenId, updatedData) => {
  try {
    // Get existing tokens
    const tokens = await getTokens();
    
    // Find and update the token
    const updatedTokens = tokens.map(token => {
      if (token.id === tokenId) {
        return { ...token, ...updatedData };
      }
      return token;
    });
    
    // Since tokens are now encrypted in the background script,
    // we send a message to background script to save tokens
    const response = await browser.runtime.sendMessage({
      action: 'saveTokens',
      tokens: updatedTokens
    });
    
    // If successful, dispatch a refresh event
    if (response && response.status === 'success') {
      window.dispatchEvent(new CustomEvent('refreshTokens'));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error updating token:', error);
    return false;
  }
};
