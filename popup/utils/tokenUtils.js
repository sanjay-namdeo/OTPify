/**
 * Generates a token based on the token type and current time period
 * @param {Object} token - The token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated token
 */
export const generateToken = (token, period) => {
  try {
    if (token.type === 'TOTP') {
      return generateTOTP(token, period);
    } else if (token.type === 'RSA') {
      return generateRSA(token);
    }
    return 'INVALID';
  } catch (error) {
    console.error('Error generating token:', error);
    return 'ERROR';
  }
};

/**
 * Generates a TOTP token
 * @param {Object} token - The TOTP token configuration
 * @param {number} period - The time period to generate the token for
 * @returns {string} - The generated TOTP token
 */
const generateTOTP = (token, period) => {
  // Parse configuration
  const {
    secret,
    algorithm = 'SHA1',
    digits = '6',
    period: tokenPeriod = '30'
  } = token;
  
  // Create TOTP instance
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret.replace(/\s/g, '')),
    algorithm: algorithm,
    digits: parseInt(digits),
    period: parseInt(tokenPeriod)
  });
  
  // Generate token for specified period
  if (period !== undefined) {
    const timestamp = period * parseInt(tokenPeriod) * 1000;
    return totp.generate({ timestamp });
  }
  
  // Generate current token
  return totp.generate();
};

/**
 * Generates an RSA token
 * @param {Object} token - The RSA token configuration
 * @returns {string} - The generated RSA token
 */
const generateRSA = (token) => {
  const { secret, serialNumber = '' } = token;
  
  // Use rsa-securid library to generate token
  // The library is loaded globally from the CDN
  try {
    const rsa = RSASecurid.v2(secret, serialNumber);
    const result = rsa.computeCode();
    return result.code;
  } catch (error) {
    console.error('Error generating RSA token:', error);
    return 'ERROR';
  }
};

/**
 * Validates a token secret based on the token type
 * @param {string} type - The token type (TOTP or RSA)
 * @param {string} secret - The token secret
 * @returns {boolean} - Whether the secret is valid
 */
export const validateSecret = (type, secret) => {
  if (!secret) return false;
  
  if (type === 'TOTP') {
    // TOTP secrets should be base32 encoded
    try {
      OTPAuth.Secret.fromBase32(secret.replace(/\s/g, ''));
      return true;
    } catch (e) {
      return false;
    }
  } else if (type === 'RSA') {
    // RSA secrets are typically numeric
    return /^[0-9]+$/.test(secret.replace(/\s/g, ''));
  }
  
  return false;
};
