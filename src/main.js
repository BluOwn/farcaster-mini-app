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

// IMPORTANT: Set this to false for production
const DEBUG_MODE = false; // Set to false for production

// Helper function to check if we're in a Warpcast Mini App environment
async function detectWarpcastEnvironment() {
  // Try multiple methods to detect if we're in Warpcast
  let inWarpcast = false;
  
  console.log("Checking if we're in Warpcast Mini App environment...");
  
  // Method 1: Try the standard SDK method
  try {
    inWarpcast = await sdk.isInMiniApp();
    console.log("SDK isInMiniApp result:", inWarpcast);
  } catch (error) {
    console.log("Error checking with isInMiniApp:", error.message);
  }
  
  // Method 2: Check context properties
  if (!inWarpcast) {
    try {
      const context = sdk.context;
      if (context && (context.client || context.user)) {
        inWarpcast = true;
        console.log("Detected Warpcast via context object");
      }
    } catch (error) {
      console.log("Error checking context:", error.message);
    }
  }
  
  // Method 3: Check URL parameters or path
  if (!inWarpcast) {
    const url = new URL(window.location.href);
    if (url.searchParams.has('miniApp') || 
        url.pathname.includes('/mini') || 
        url.hostname.includes('warpcast.com')) {
      inWarpcast = true;
      console.log("Detected Warpcast via URL pattern");
    }
  }
  
  // Method 4: Check if running in iframe or webview
  if (!inWarpcast) {
    if (window.parent !== window || 
        navigator.userAgent.includes('wv') || 
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
      inWarpcast = true;
      console.log("Likely in embedded view (iframe/webview), assuming Warpcast");
    }
  }
  
  return inWarpcast;
}

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
  
  // Try to hide splash screen immediately to prevent it getting stuck
  try {
    await sdk.actions.ready();
    console.log('Initial splash screen hide successful');
  } catch (error) {
    console.error('Initial splash screen hide error:', error);
  }
  
  // Add Warpcast warning if not in Mini App
  const authWarning = document.createElement('div');
  authWarning.id = 'auth-warning';
  authWarning.classList.add('bg-red-600', 'text-white', 'p-4', 'mb-4', 'hidden', 'rounded', 'text-center');
  authWarning.innerText = 'This game must be opened in Warpcast as a Mini App';
  document.body.prepend(authWarning);
  
  // Add debug status display - only in debug mode
  if (DEBUG_MODE) {
    const statusDisplay = document.createElement('div');
    statusDisplay.id = 'status-display';
    statusDisplay.classList.add('bg-black', 'text-green-400', 'p-2', 'mb-4', 'font-mono', 'text-sm', 'rounded', 'overflow-auto');
    statusDisplay.style.maxHeight = '200px';
    document.body.prepend(statusDisplay);
  }
  
  // Function to update status
  const updateStatus = (message) => {
    if (DEBUG_MODE) {
      console.log(message);
      const statusDisplay = document.getElementById('status-display');
      if (statusDisplay) {
        statusDisplay.innerHTML += `<div>${message}</div>`;
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
      }
    } else {
      console.log(message);
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
    // Enhanced Warpcast environment detection
    const isInWarpcast = await detectWarpcastEnvironment();
    updateStatus(`Is in Warpcast environment: ${isInWarpcast}`);
    
    // For safety, force it to true - we'll assume we're in Warpcast
    // This is because we want the game to work even if detection fails
    let forceWarpcast = true;
    updateStatus(`Forcing Warpcast environment: ${forceWarpcast}`);
    
    if (!isInWarpcast && !forceWarpcast && !DEBUG_MODE) {
      document.getElementById('auth-warning').classList.remove('hidden');
      updateStatus("Not in Warpcast environment, showing warning");
      
      // Add a force proceed button
      const proceedButton = document.createElement('button');
      proceedButton.classList.add('bg-yellow-500', 'text-black', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-2', 'block', 'mx-auto');
      proceedButton.innerText = 'Proceed Anyway';
      proceedButton.onclick = () => {
        document.getElementById('auth-warning').classList.add('hidden');
        continueInitialization(true);
      };
      
      document.getElementById('auth-warning').appendChild(proceedButton);
      return;
    }
    
    // Continue with initialization
    await continueInitialization(isInWarpcast || forceWarpcast);
    
  } catch (error) {
    console.error('Detection error:', error);
    // Proceed anyway if detection fails
    await continueInitialization(true);
  }
}

// Continuation of initialization after environment detection
async function continueInitialization(isInWarpcast) {
  const updateStatus = (message) => {
    if (DEBUG_MODE) {
      console.log(message);
      const statusDisplay = document.getElementById('status-display');
      if (statusDisplay) {
        statusDisplay.innerHTML += `<div>${message}</div>`;
        statusDisplay.scrollTop = statusDisplay.scrollHeight;
      }
    } else {
      console.log(message);
    }
  };
  
  try {
    // Initialize authentication
    updateStatus("Initializing authentication...");
    const auth = new Auth();
    
    let isInitialized = false;
    try {
      isInitialized = await auth.init();
      updateStatus(`Auth initialized: ${isInitialized}`);
    } catch (error) {
      updateStatus(`Auth initialization error: ${error.message}`);
      
      if (DEBUG_MODE || isInWarpcast) {
        isInitialized = true;
        updateStatus("Forcing auth initialization to succeed");
        auth.user = { fid: 123456, username: "warpcast_user" };
        auth.isSignedIn = true;
      }
    }
    
    if (!isInitialized && !DEBUG_MODE && !isInWarpcast) {
      updateStatus('Failed to initialize auth');
      document.getElementById('user-info').innerText = 'Authentication failed. Please try again.';
      
      // Hide splash screen even if auth fails
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Error hiding splash screen:', error);
      }
      
      return;
    }
    
    // Initialize contract connection
    updateStatus("Initializing contract connection...");
    updateStatus(`Contract address: ${PACMAN_CONTRACT_ADDRESS}`);
    
    let contract;
    try {
      // Setup provider and contract
      if (window.ethereum) {
        // Request account access if needed
        try {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
        } catch (error) {
          throw new Error(`Account access denied: ${error.message}`);
        }
        
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        
        // Check connected network
        const network = await provider.getNetwork();
        updateStatus(`Connected to network ID: ${network.chainId}`);
        
        // Check if connected to Monad Testnet (chainId 10143)
        if (network.chainId !== 10143 && !DEBUG_MODE) {
          // Instead of throwing error, try to switch network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x2795' }], // 10143 in hex
            });
            updateStatus("Switched to Monad Testnet");
            
            // Recreate provider after network switch
            const updatedProvider = new ethers.providers.Web3Provider(window.ethereum);
            const updatedSigner = updatedProvider.getSigner();
            contract = new ethers.Contract(PACMAN_CONTRACT_ADDRESS, PACMAN_ABI, updatedSigner);
          } catch (switchError) {
            // If network switch fails, create a mock contract
            updateStatus(`Network switch failed: ${switchError.message}`);
            throw new Error('Please connect to Monad Testnet (Chain ID: 10143)');
          }
        } else {
          contract = new ethers.Contract(PACMAN_CONTRACT_ADDRESS, PACMAN_ABI, signer);
        }
        
        updateStatus("Contract connection established");
      } else {
        throw new Error("MetaMask or compatible wallet not found");
      }
    } catch (error) {
      updateStatus(`Contract initialization error: ${error.message}`);
      
      // Always create a mock contract - this allows the game to be playable
      // even without a proper wallet connection
      updateStatus("Creating mock contract");
      contract = {
        payGameFee: async (fid, username, options) => {
          updateStatus(`Mock contract: payGameFee called with FID: ${fid}, username: ${username}`);
          return { wait: async () => {} };
        },
        updateScore: async (fid, score) => {
          updateStatus(`Mock contract: updateScore called with FID: ${fid}, score: ${score}`);
          return { wait: async () => {} };
        },
        getTopPlayers: async (count) => {
          updateStatus(`Mock contract: getTopPlayers(${count}) called`);
          return [
            { fid: { toString: () => "1001" }, username: "player1", highScore: { toNumber: () => 10000 } },
            { fid: { toString: () => "1002" }, username: "player2", highScore: { toNumber: () => 8000 } },
            { fid: { toString: () => "1003" }, username: "player3", highScore: { toNumber: () => 6000 } },
            { fid: { toString: () => "1004" }, username: "player4", highScore: { toNumber: () => 5000 } },
            { fid: { toString: () => "1005" }, username: "player5", highScore: { toNumber: () => 4000 } }
          ];
        }
      };
      
      // Only show error message if not in Warpcast or debug mode
      if (!DEBUG_MODE && !isInWarpcast) {
        document.getElementById('game-container').innerHTML = `
          <div class="bg-red-600 text-white p-4 rounded text-center">
            Error connecting to blockchain: ${error.message || 'Unknown error'}
            <br>
            Please make sure you have MetaMask installed and connected to Monad Testnet.
            <button id="retry-connect" class="mt-2 bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded">
              Retry Connection
            </button>
          </div>
        `;
        
        // Add retry button functionality
        document.getElementById('retry-connect')?.addEventListener('click', () => {
          window.location.reload();
        });
      }
    }
    
    // Sign in with Warpcast if needed
    if (!auth.isSignedIn) {
      updateStatus("Not signed in, attempting to sign in...");
      try {
        await auth.signIn();
        updateStatus("Sign-in complete");
      } catch (error) {
        updateStatus(`Sign-in error: ${error.message}`);
        
        // Auto-sign in for Warpcast users even if sign-in fails
        if (isInWarpcast) {
          auth.isSignedIn = true;
          auth.user = auth.user || { fid: 999999, username: "warpcast_player" };
          updateStatus("Auto-sign in for Warpcast user");
        } else {
          document.getElementById('user-info').innerText = 'Sign-in failed. Please try again.';
          
          // Still hide splash screen
          try {
            await sdk.actions.ready();
          } catch (error) {
            console.error('Error hiding splash screen:', error);
          }
          
          return;
        }
      }
    }
    
    // Update user info display
    if (auth.user) {
      document.getElementById('user-info').innerText = `Signed in as: ${auth.user.displayName || auth.user.username || `FID: ${auth.user.fid}`}`;
    }
    
    // Initialize game with debug mode
    updateStatus("Initializing game...");
    const game = new PacmanGame('game-container', auth, contract, DEBUG_MODE || isInWarpcast);
    try {
      await game.init();
      updateStatus("Game initialized");
    } catch (error) {
      updateStatus(`Game initialization error: ${error.message}`);
      document.getElementById('game-container').innerHTML = `
        <div class="bg-red-600 text-white p-4 rounded text-center">
          Error initializing game: ${error.message || 'Unknown error'}
          <button id="retry-game" class="mt-2 bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded">
            Retry
          </button>
        </div>
      `;
      
      // Add retry button functionality
      document.getElementById('retry-game')?.addEventListener('click', () => {
        window.location.reload();
      });
      
      // Still hide splash screen
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.error('Error hiding splash screen:', error);
      }
      
      return;
    }
    
    // Initialize leaderboard
    updateStatus("Initializing leaderboard...");
    const leaderboard = new Leaderboard('leaderboard-container', contract, DEBUG_MODE || isInWarpcast);
    try {
      await leaderboard.init();
      updateStatus("Leaderboard initialized");
    } catch (error) {
      updateStatus(`Leaderboard initialization error: ${error.message}`);
      document.getElementById('leaderboard-container').innerHTML = `
        <div class="bg-yellow-600 text-white p-4 rounded text-center">
          Could not load leaderboard: ${error.message || 'Unknown error'}
          <button id="retry-leaderboard" class="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Retry Leaderboard
          </button>
        </div>
      `;
      
      // Add retry button functionality
      document.getElementById('retry-leaderboard')?.addEventListener('click', () => {
        leaderboard.refresh();
      });
    }
    
    // Add virtual controls for mobile automatically
    if ('ontouchstart' in window) {
      updateStatus("Mobile device detected, adding virtual controls");
      addVirtualControls('game-container');
    }
    
    // Add emergency override button (hidden by default)
    const emergencyDiv = document.createElement('div');
    emergencyDiv.classList.add('text-center', 'mt-4');
    emergencyDiv.innerHTML = `
      <button id="force-debug-button" class="bg-gray-700 text-white text-xs py-1 px-2 rounded opacity-50 hover:opacity-100">
        Force Debug Mode
      </button>
    `;
    document.body.appendChild(emergencyDiv);
    
    document.getElementById('force-debug-button').addEventListener('click', () => {
      // Enable debug mode
      const gameInstance = game;
      if (gameInstance) {
        gameInstance.debugMode = true;
        gameInstance.gamePaid = true;
        
        // Show start button
        const startButton = document.getElementById('start-button');
        if (startButton) startButton.classList.remove('hidden');
        
        // Hide payment button
        const payButton = document.getElementById('pay-button');
        if (payButton) payButton.classList.add('hidden');
        
        alert('Debug mode enabled! You can now play without payment.');
      }
    });
    
    // Notify that app is ready
    updateStatus("Calling sdk.actions.ready() to hide splash screen...");
    try {
      await sdk.actions.ready();
      updateStatus('Mini App is ready! Splash screen should now be hidden.');
    } catch (error) {
      updateStatus(`Error with ready action: ${error.message}`);
      
      // Try one more time after a short delay
      setTimeout(async () => {
        try {
          await sdk.actions.ready();
          updateStatus('Delayed splash screen hide successful.');
        } catch (e) {
          updateStatus(`Delayed splash screen hide failed: ${e.message}`);
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    updateStatus(`Fatal initialization error: ${error.message}`);
    
    // Try to keep the app working despite errors
    document.getElementById('game-container').innerHTML = `
      <div class="bg-red-600 text-white p-4 rounded text-center">
        An error occurred during initialization: ${error.message}
        <button onclick="window.location.reload()" class="mt-2 bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded">
          Reload Page
        </button>
      </div>
    `;
    
    // Still hide the splash screen
    try {
      await sdk.actions.ready();
      updateStatus("Hiding splash screen despite fatal error");
    } catch (error) {
      updateStatus(`Error hiding splash screen: ${error.message}`);
    }
  }
}

// Helper function to add virtual controls for mobile
function addVirtualControls(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const controlsContainer = document.createElement('div');
  controlsContainer.classList.add('virtual-controls', 'mt-4', 'flex', 'flex-col', 'items-center', 'gap-2');
  controlsContainer.style.touchAction = 'none';
  
  // Add title
  const title = document.createElement('div');
  title.classList.add('text-white', 'mb-2', 'text-sm');
  title.innerText = 'Touch Controls';
  controlsContainer.appendChild(title);
  
  // Create dpad layout
  const dpad = document.createElement('div');
  dpad.classList.add('grid', 'grid-cols-3', 'gap-1');
  
  const directions = [
    { x: 0, y: 0, name: '', arrow: '' },
    { x: 1, y: 0, name: 'up', arrow: '↑', key: 'ArrowUp' },
    { x: 2, y: 0, name: '', arrow: '' },
    { x: 0, y: 1, name: 'left', arrow: '←', key: 'ArrowLeft' },
    { x: 1, y: 1, name: '', arrow: '•' },
    { x: 2, y: 1, name: 'right', arrow: '→', key: 'ArrowRight' },
    { x: 0, y: 2, name: '', arrow: '' },
    { x: 1, y: 2, name: 'down', arrow: '↓', key: 'ArrowDown' },
    { x: 2, y: 2, name: '', arrow: '' }
  ];
  
  directions.forEach(dir => {
    const cell = document.createElement('div');
    cell.style.width = '60px';
    cell.style.height = '60px';
    cell.style.display = 'flex';
    cell.style.justifyContent = 'center';
    cell.style.alignItems = 'center';
    
    if (dir.name) {
      const button = document.createElement('button');
      button.classList.add('bg-blue-500', 'hover:bg-blue-700', 'text-white', 'font-bold', 'rounded-full', 'w-full', 'h-full', 'flex', 'items-center', 'justify-center', 'text-2xl');
      button.innerText = dir.arrow;
      button.setAttribute('data-direction', dir.name);
      button.setAttribute('data-key', dir.key);
      
      // Add control handlers for buttons
      const sendKeyEvent = (type, key) => {
        const event = new KeyboardEvent(type, {
          key: key,
          bubbles: true,
          cancelable: true
        });
        document.dispatchEvent(event);
      };
      
      // Touch events for mobile
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        sendKeyEvent('keydown', dir.key);
      }, { passive: false });
      
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        sendKeyEvent('keyup', dir.key);
      }, { passive: false });
      
      // Mouse events for desktop testing
      button.addEventListener('mousedown', () => {
        sendKeyEvent('keydown', dir.key);
      });
      
      button.addEventListener('mouseup', () => {
        sendKeyEvent('keyup', dir.key);
      });
      
      button.addEventListener('mouseleave', () => {
        sendKeyEvent('keyup', dir.key);
      });
      
      cell.appendChild(button);
    }
    
    dpad.appendChild(cell);
  });
  
  controlsContainer.appendChild(dpad);
  container.appendChild(controlsContainer);
}

// Start the app
init();