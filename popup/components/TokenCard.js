import ProgressBar from './ProgressBar.js';
import { generateToken } from '../utils/tokenUtils.js';

const { useState, useEffect } = React;

const TokenCard = ({ token }) => {
  const [currentToken, setCurrentToken] = useState('');
  const [nextToken, setNextToken] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(30);
  
  // Generate tokens and update at regular intervals
  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    
    const generateTokens = () => {
      // Get current time in seconds
      const now = Math.floor(Date.now() / 1000);
      
      // Calculate time remaining in current period (30 seconds)
      const secondsInPeriod = 30;
      const currentPeriod = Math.floor(now / secondsInPeriod);
      const nextTimestamp = (currentPeriod + 1) * secondsInPeriod;
      const remaining = nextTimestamp - now;
      
      if (isMounted) {
        setTimeRemaining(remaining);
      }
      
      try {
        // Generate current token - assume synchronous for now
        const current = generateToken(token, currentPeriod);
        if (isMounted) {
          setCurrentToken(current || '------');
        }
        
        // Generate next token - assume synchronous for now
        const next = generateToken(token, currentPeriod + 1);
        if (isMounted) {
          setNextToken(next || '------');
        }
      } catch (error) {
        console.error('Error generating tokens in TokenCard:', error);
        if (isMounted) {
          setCurrentToken('------');
          setNextToken('------');
        }
      }
    };
    
    // Generate tokens immediately
    generateTokens();
    
    // Set up interval to update time remaining every second
    const interval = setInterval(() => {
      if (isMounted) {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // When time expires, regenerate tokens
            generateTokens();
            return 30;
          }
          return prev - 1;
        });
      }
    }, 1000);
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);
  
  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">{token.name}</h2>
        <span>{token.type}</span>
      </div>
      
      <div className="token-info">
        <div className="token-label">Account</div>
        <div>{token.account}</div>
      </div>
      
      <div className="token-info">
        <div className="token-label">Current Token</div>
        <div className="token-value">{currentToken}</div>
      </div>
      
      <div className="token-info">
        <div className="token-label">Next Token</div>
        <div className="token-value">{nextToken}</div>
      </div>
      
      <ProgressBar seconds={timeRemaining} totalSeconds={30} />
    </div>
  );
};

export default TokenCard;
