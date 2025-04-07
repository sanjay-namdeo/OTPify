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
    
    // Save back to storage
    await browser.storage.sync.set({ tokens });
    
    return true;
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
    // Check if we're using browser.storage (Firefox) or chrome.storage (Chrome)
    const storage = browser?.storage?.sync || chrome?.storage?.sync;
    
    if (!storage) {
      console.error('Browser storage API not available');
      return [];
    }
    
    const result = await storage.get('tokens');
    return result.tokens || [];
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
    
    // Save back to storage
    await browser.storage.sync.set({ tokens: updatedTokens });
    
    return true;
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
    
    // Save back to storage
    await browser.storage.sync.set({ tokens: updatedTokens });
    
    return true;
  } catch (error) {
    console.error('Error updating token:', error);
    return false;
  }
};
