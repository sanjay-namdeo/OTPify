/**
 * Generates a token based on the token type and current time period
 * @param {Object} token - The token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated token
 */
export const generateToken = (token, period) => {
  if (token.type === 'TOTP') {
    return generateTOTPToken(token, period);
  } else if (token.type === 'RSA') {
    return generateRSAToken(token);
  }
  return null;
};

/**
 * Generates a TOTP token
 * @param {Object} token - The TOTP token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated TOTP token
 */
export const generateTOTPToken = (token, period = 30) => {
  try {
    // Create a new TOTP object
    const totp = new OTPAuth.TOTP({
      issuer: token.issuer || '',
      label: token.account || '',
      algorithm: token.algorithm || 'SHA1',
      digits: token.digits || 6,
      period: period,
      secret: OTPAuth.Secret.fromBase32(token.secret)
    });
    
    // Generate the token
    return totp.generate();
  } catch (error) {
    console.error('Error generating TOTP token:', error);
    return null;
  }
};

/**
 * Generates an RSA token
 * @param {Object} token - The RSA token configuration
 * @returns {string} - The generated RSA token
 */
export const generateRSAToken = (token) => {
  try {
    // Use our custom RSA simulator
    const generator = new RSASecurID.TokenGenerator(token.secret);
    return generator.getTokenCode();
  } catch (error) {
    console.error('Error generating RSA token:', error);
    return null;
  }
};

/**
 * Gets the next token that will be generated
 * @param {Object} token - The token configuration 
 * @returns {string} - The next token
 */
export const getNextToken = (token) => {
  if (token.type === 'TOTP') {
    // For TOTP, generate token for next period
    return generateTOTPToken(token, 30);
  } else if (token.type === 'RSA') {
    // For RSA, use the getNextTokenCode method
    try {
      const generator = new RSASecurID.TokenGenerator(token.secret);
      return generator.getNextTokenCode();
    } catch (error) {
      console.error('Error generating next RSA token:', error);
      return null;
    }
  }
  return null;
};

/**
 * Calculates the time remaining until the token refreshes
 * @returns {number} - Seconds remaining
 */
export const getTimeRemaining = () => {
  const now = Math.floor(Date.now() / 1000);
  return 30 - (now % 30);
};

/**
 * Validates a token secret based on the token type
 * @param {string} type - The token type (TOTP or RSA)
 * @param {string} secret - The token secret
 * @returns {boolean} - Whether the secret is valid
 */
export const validateSecret = (type, secret) => {
  if (!secret || secret.trim() === '') {
    return false;
  }
  
  if (type === 'TOTP') {
    try {
      // Try to parse it as a Base32 secret
      OTPAuth.Secret.fromBase32(secret);
      return true;
    } catch (error) {
      return false;
    }
  } else if (type === 'RSA') {
    // RSA secrets should be at least 16 characters long
    return secret.length >= 16;
  }
  
  return false;
};
