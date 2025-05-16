import './style.css';
import { ethers } from 'ethers';
import { config } from './utils/ethers-config.js';
import { sdk } from '@farcaster/frame-sdk';
import { PACMAN_ABI } from './contracts/pacman-abi.js';

import Auth from './components/auth.js';
import PacmanGame from './components/game.js';
import Leaderboard from './components/leaderboard.js';

// Set your contract address here
const PACMAN_CONTRACT_ADDRESS = "0x1234567890123456789012345678901234567890"; // Replace with your actual contract address

// Debug mode to bypass blockchain requirements (for testing)
const DEBUG_MODE = true; // Set to false for production

// Initialize app
async function init() {
  console.log("App initialization started...");
  
  // Wait for DOM to be fully loaded
  if (document.readyState !== 'complete') {
    console.log("Document not ready, waiting for load event...");
    window.addEventListener('load', init);
    return;
  }
  
  console.log("DOM fully loaded, continuing initialization...");
  
  // Add Warpcast warning if not in Mini App
  const authWarning = document.createElement('div');
  authWarning.id = 'auth-warning';
  authWarning.classList.add('bg-red-600', 'text-white', 'p-4', 'mb-4', 'hidden', 'rounded', 'text-center');
  authWarning.innerText = 'This game must be opened in Warpcast as a Mini App';
  document.body.prepend(authWarning);
  
  // Add debug status display
  const statusDisplay = document.createElement('div');
  statusDisplay.id = 'status-display';
  statusDisplay.classList.add('bg-black', 'text-green-400', 'p-2', 'mb-4', 'font-mono', 'text-sm', 'rounded', 'overflow-auto');
  statusDisplay.style.maxHeight = '200px';
  statusDisplay.style.display = DEBUG_MODE ? 'block' : 'none';
  document.body.prepend(statusDisplay);
  
  // Function to update status
  const updateStatus = (message) => {
    if (DEBUG_MODE) {
      console.log(message);
      const statusDisplay = document.getElementById('status-display');
      if (statusDisplay) {
        statusDisplay.innerHTML += `<div>${message}</div>`;
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
      }
    }
  };
  
  updateStatus("Initializing app...");
  
  // Create app sections
  document.body.innerHTML += `
    <div class="container mx-auto p-4">
      <h1 class="text-3xl text-yellow-300 text-center font-bold mb-6">Pacman on Monad</h1>
      
      <div id="user-info" class="text-center text-white mb-4">Please sign in with Warpcast</div>
      
      <div id="game-container" class="relative mb-8"></div>
      
      <div id="leaderboard-container"></div>
    </div>
  `;
  
  try {
    updateStatus("Checking if we're in a Mini App context...");
    let isInMiniApp = false;
    
    try {
      isInMiniApp = await sdk.isInMiniApp();
      updateStatus(`Is in Mini App: ${isInMiniApp}`);
    } catch (error) {
      updateStatus(`Error checking Mini App context: ${error.message}`);
      
      if (DEBUG_MODE) {
        isInMiniApp = true;
        updateStatus("DEBUG MODE: Forcing Mini App context to true");
      }
    }
    
    if (!isInMiniApp && !DEBUG_MODE) {
      document.getElementById('auth-warning').classList.remove('hidden');
      updateStatus("Not in Mini App context, showing warning");
      
      // Still hide the splash screen
      try {
        await sdk.actions.ready();
        updateStatus("Hiding splash screen despite not being in Mini App");
      } catch (error) {
        updateStatus(`Error hiding splash screen: ${error.message}`);
      }
      
      return;
    }
    
    // Initialize authentication
    updateStatus("Initializing authentication...");
    const auth = new Auth();
    
    let isInitialized = false;
    try {
      isInitialized = await auth.init();
      updateStatus(`Auth initialized: ${isInitialized}`);
    } catch (error) {
      updateStatus(`Auth initialization error: ${error.message}`);
      
      if (DEBUG_MODE) {
        isInitialized = true;
        updateStatus("DEBUG MODE: Forcing auth initialization to succeed");
        auth.user = { fid: 123456, username: "debug_user" };
        auth.isSignedIn = true;
      }
    }
    
    if (!isInitialized && !DEBUG_MODE) {
      updateStatus('Failed to initialize auth');
      document.getElementById('user-info').innerText = 'Authentication failed. Please try again.';
      
      // Still hide the splash screen
      try {
        await sdk.actions.ready();
        updateStatus("Hiding splash screen despite auth failure");
      } catch (error) {
        updateStatus(`Error hiding splash screen: ${error.message}`);
      }
      
      return;
    }
    
    // Initialize contract connection
    updateStatus("Initializing contract connection...");
    updateStatus(`Contract address: ${PACMAN_CONTRACT_ADDRESS}`);
    
    let contract;
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      contract = new ethers.Contract(PACMAN_CONTRACT_ADDRESS, PACMAN_ABI, signer);
      updateStatus("Contract connection established");
    } catch (error) {
      updateStatus(`Contract initialization error: ${error.message}`);
      
      if (DEBUG_MODE) {
        // Create a mock contract for testing
        updateStatus("DEBUG MODE: Creating mock contract");
        contract = {
          payGameFee: async () => {
            updateStatus("Mock contract: payGameFee called");
            return { wait: async () => {} };
          },
          updateScore: async () => {
            updateStatus("Mock contract: updateScore called");
            return { wait: async () => {} };
          },
          getTopPlayers: async () => {
            updateStatus("Mock contract: getTopPlayers called");
            return [
              { username: "player1", highScore: { toNumber: () => 10000 } },
              { username: "player2", highScore: { toNumber: () => 8000 } },
              { username: "player3", highScore: { toNumber: () => 6000 } }
            ];
          }
        };
      } else {
        document.getElementById('game-container').innerHTML = `
          <div class="bg-red-600 text-white p-4 rounded text-center">
            Error connecting to blockchain: ${error.message || 'Unknown error'}
            <br>
            Please make sure you have MetaMask installed and connected to Monad Testnet.
          </div>
        `;
        
        // Still hide the splash screen
        try {
          await sdk.actions.ready();
          updateStatus("Hiding splash screen despite contract failure");
        } catch (error) {
          updateStatus(`Error hiding splash screen: ${error.message}`);
        }
        
        return;
      }
    }
    
    // Sign in with Warpcast
    if (!auth.isSignedIn && !DEBUG_MODE) {
      updateStatus("Not signed in, attempting to sign in...");
      try {
        await auth.signIn();
        updateStatus("Sign-in complete");
      } catch (error) {
        updateStatus(`Sign-in error: ${error.message}`);
        document.getElementById('user-info').innerText = 'Sign-in failed. Please try again.';
        
        // Still hide the splash screen
        try {
          await sdk.actions.ready();
          updateStatus("Hiding splash screen despite sign-in failure");
        } catch (error) {
          updateStatus(`Error hiding splash screen: ${error.message}`);
        }
        
        return;
      }
    }
    
    // Initialize game
    updateStatus("Initializing game...");
    const game = new PacmanGame('game-container', auth, contract, DEBUG_MODE);
    try {
      await game.init();
      updateStatus("Game initialized");
    } catch (error) {
      updateStatus(`Game initialization error: ${error.message}`);
      document.getElementById('game-container').innerHTML = `
        <div class="bg-red-600 text-white p-4 rounded text-center">
          Error initializing game: ${error.message || 'Unknown error'}
        </div>
      `;
      
      // Still hide the splash screen
      try {
        await sdk.actions.ready();
        updateStatus("Hiding splash screen despite game init failure");
      } catch (error) {
        updateStatus(`Error hiding splash screen: ${error.message}`);
      }
      
      return;
    }
    
    // Initialize leaderboard
    updateStatus("Initializing leaderboard...");
    const leaderboard = new Leaderboard('leaderboard-container', contract);
    try {
      await leaderboard.init();
      updateStatus("Leaderboard initialized");
    } catch (error) {
      updateStatus(`Leaderboard initialization error: ${error.message}`);
      document.getElementById('leaderboard-container').innerHTML = `
        <div class="bg-yellow-600 text-white p-4 rounded text-center">
          Could not load leaderboard: ${error.message || 'Unknown error'}
        </div>
      `;
    }
    
    // Notify that app is ready
    updateStatus("Calling sdk.actions.ready() to hide splash screen...");
    try {
      await sdk.actions.ready();
      updateStatus('Mini App is ready! Splash screen should now be hidden.');
    } catch (error) {
      updateStatus(`Error with ready action: ${error.message}`);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Fatal initialization error: ${error.message}`);
    document.getElementById('auth-warning').classList.remove('hidden');
    
    // Still hide the splash screen
    try {
      await sdk.actions.ready();
      updateStatus("Hiding splash screen despite fatal error");
    } catch (error) {
      updateStatus(`Error hiding splash screen: ${error.message}`);
    }
  }
}

// Start the app
init();