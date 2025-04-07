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
  ReactDOM.render(React.createElement(App), root);
});

// Listen for messages from the background script
browser.runtime.onMessage.addListener((message) => {
  if (message.action === "refreshTokens") {
    // Publish a custom event that the App component will listen for
    window.dispatchEvent(new CustomEvent('refreshTokens'));
  }
});
