import App from './components/App.js';

// Check if the browser is in dark mode
const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
document.body.classList.toggle('dark-theme', isDarkMode);

// Listen for changes in color scheme
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
  document.body.classList.toggle('dark-theme', event.matches);
});

// Initialize the React app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('root');
  
  // Make sure React and ReactDOM are defined
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    console.error('React or ReactDOM is not defined');
    root.innerHTML = '<p>Error: Could not load React</p>';
    return;
  }
  
  try {
    ReactDOM.render(React.createElement(App), root);
  } catch (error) {
    console.error('Error rendering React app:', error);
    root.innerHTML = `<p>Error: ${error.message}</p>`;
  }
});

// Listen for messages from the background script
try {
  if (typeof browser !== 'undefined') {
    browser.runtime.onMessage.addListener((message) => {
      if (message.action === "refreshTokens") {
        // Publish a custom event that the App component will listen for
        window.dispatchEvent(new CustomEvent('refreshTokens'));
      }
    });
  } else if (typeof chrome !== 'undefined') {
    // Fallback for Chrome
    chrome.runtime.onMessage.addListener((message) => {
      if (message.action === "refreshTokens") {
        window.dispatchEvent(new CustomEvent('refreshTokens'));
      }
    });
  } else {
    console.warn('Neither browser nor chrome runtime API available');
  }
} catch (error) {
  console.error('Error setting up message listener:', error);
}
