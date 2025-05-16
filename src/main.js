import './style.css';
import { ethers } from 'ethers';
import { config } from './utils/ethers-config.js';
import { sdk } from '@farcaster/frame-sdk';
import { PACMAN_ABI } from './contracts/pacman-abi.js';

import Auth from './components/auth.js';
import PacmanGame from './components/game.js';
import Leaderboard from './components/leaderboard.js';

// Initialize app
async function init() {
  // Wait for DOM to be fully loaded
  if (document.readyState !== 'complete') {
    window.addEventListener('load', init);
    return;
  }
  
  // Add Warpcast warning if not in Mini App
  const authWarning = document.createElement('div');
  authWarning.id = 'auth-warning';
  authWarning.classList.add('bg-red-600', 'text-white', 'p-4', 'mb-4', 'hidden', 'rounded', 'text-center');
  authWarning.innerText = 'This game must be opened in Warpcast as a Mini App';
  document.body.prepend(authWarning);
  
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
    // Initialize authentication
    const auth = new Auth();
    const isInitialized = await auth.init();
    
    if (!isInitialized) {
      console.log('Failed to initialize auth');
      return;
    }
    
    // Initialize contract connection
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(PACMAN_CONTRACT_ADDRESS, PACMAN_ABI, signer);
    
    // Sign in with Warpcast
    if (!auth.isSignedIn) {
      await auth.signIn();
    }
    
    // Initialize game
    const game = new PacmanGame('game-container', auth, contract);
    await game.init();
    
    // Initialize leaderboard
    const leaderboard = new Leaderboard('leaderboard-container', contract);
    await leaderboard.init();
    
    // Notify that app is ready
    try {
      await sdk.actions.ready();
      console.log('Mini App is ready!');
    } catch (error) {
      console.error('Error with ready action:', error);
    }
  } catch (error) {
    console.error('Initialization error:', error);
    document.getElementById('auth-warning').classList.remove('hidden');
  }
}

// Start the app
init();