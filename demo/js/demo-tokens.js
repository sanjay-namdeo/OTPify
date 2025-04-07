/**
 * Sample demo tokens for the OTPify extension demo
 */
const demoTokens = [
  {
    id: '1',
    name: 'GitHub',
    type: 'TOTP',
    account: 'user@example.com',
    issuer: 'GitHub',
    secret: 'JBSWY3DPEHPK3PXP', // Example secret - not a real one
    algorithm: 'SHA1',
    digits: 6
  },
  {
    id: '2',
    name: 'AWS Account',
    type: 'TOTP',
    account: 'admin@company.com',
    issuer: 'Amazon Web Services',
    secret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ', // Example secret - not a real one
    algorithm: 'SHA1',
    digits: 6
  },
  {
    id: '3',
    name: 'VPN Access',
    type: 'RSA',
    account: 'john.doe',
    secret: 'f3d8f9a1c6e0b5d2' // Example seed - not a real one
  }
];
