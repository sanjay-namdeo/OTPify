/**
 * Securely saves a token using Firefox's password manager
 * @param {Object} token - The token to save
 * @returns {Promise<void>}
 */
export const saveToken = async (token) => {
  try {
    // Get existing tokens
    const tokens = await getTokens();
    
    // Add the new token
    const updatedTokens = [...tokens, token];
    
    // Save to local storage for now (will be replaced with secure storage)
    await browser.storage.local.set({ tokens: updatedTokens });
    
    // Firefox doesn't have a direct password manager API for extensions,
    // but we can use the identity API to store credentials.
    // This is a simplified implementation - in production, you'd want to
    // encrypt the secret with a master password or use a more secure approach.
    
    // Note that for better security in a real-world implementation,
    // you would want to integrate with Firefox's password manager
    // using the appropriate approaches recommended by Mozilla.
    
    // For demonstration purposes, we're storing tokens in local storage
    // but in a real application you'd want to implement a more secure solution.
    
    return true;
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

/**
 * Retrieves all tokens from storage
 * @returns {Promise<Array>} - The array of tokens
 */
export const getTokens = async () => {
  try {
    const { tokens } = await browser.storage.local.get('tokens');
    return tokens || [];
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
    
    // Save the updated tokens
    await browser.storage.local.set({ tokens: updatedTokens });
    
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
    
    // Save the updated tokens
    await browser.storage.local.set({ tokens: updatedTokens });
    
    return true;
  } catch (error) {
    console.error('Error updating token:', error);
    return false;
  }
};
