import { ethers } from 'ethers';
import { sdk } from '@farcaster/frame-sdk';

export default class PacmanGame {
  constructor(containerId, authInstance, contract, debugMode = false) {
    this.container = document.getElementById(containerId);
    this.auth = authInstance;
    this.contract = contract;
    this.debugMode = debugMode;
    this.canvas = null;
    this.ctx = null;
    this.score = 0;
    this.gameOver = false;
    this.gameStarted = false;
    this.level = 1;
    this.gamePaid = false;
    this.isMobile = 'ontouchstart' in window;
    
    // Game elements
    this.pacman = {
      x: 0,
      y: 0,
      size: 30,
      speed: 5,
      direction: 'right',
      mouthOpen: true,
      mouthAngle: 0.2,
      color: '#FFFF00'
    };
    
    this.ghosts = [];
    this.dots = [];
    this.powerPellets = [];
    this.walls = [];
    
    // Game settings
    this.gameWidth = this.isMobile ? Math.min(window.innerWidth - 30, 600) : 600;
    this.gameHeight = this.isMobile ? Math.min(window.innerHeight * 0.5, 500) : 500;
    this.dotSize = 5;
    this.powerPelletSize = 15;
    this.dotValue = 10;
    this.powerPelletValue = 50;
    
    // Controls
    this.keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false
    };
    
    // Mobile controls
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.virtualButtons = {}; // For virtual controls
    
    // Game sounds
    this.sounds = {
      start: null,
      munch: null,
      powerPellet: null,
      ghostEaten: null,
      death: null,
      levelComplete: null
    };
    
    // Images
    this.images = {
      pacmanRight: null,
      pacmanLeft: null,
      pacmanUp: null,
      pacmanDown: null,
      pacmanClosed: null,
      ghostRed: null,
      ghostPink: null,
      ghostBlue: null,
      ghostOrange: null,
      ghostVulnerable: null,
      dot: null,
      powerPellet: null,
      wall: null
    };
    
    this.assetsLoaded = false;
    this.paymentInProgress = false;
    this.lastFrameTime = 0;
    this.fps = 60;
    
    this.log(`Game initialized with debug mode: ${debugMode}`);
  }
  
  log(message) {
    if (this.debugMode) {
      console.log(`[PacmanGame] ${message}`);
    }
  }
  
  async init() {
    this.log('Initializing game...');
    
    try {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.width = this.gameWidth;
      this.canvas.height = this.gameHeight;
      this.canvas.style.border = '4px solid blue';
      this.canvas.style.backgroundColor = 'black';
      this.canvas.style.display = 'block';
      this.canvas.style.margin = '0 auto';
      this.canvas.style.touchAction = 'none'; // Prevent scrolling on touch
      
      // Make canvas responsive to device size
      if (this.isMobile) {
        this.canvas.style.width = '100%';
        this.canvas.style.maxWidth = `${this.gameWidth}px`;
      }
      
      this.ctx = this.canvas.getContext('2d');
      this.container.appendChild(this.canvas);
      
      // Try to load assets
      try {
        this.loadAssets();
      } catch (error) {
        this.log(`Asset loading error: ${error.message}`);
        // Continue without assets
      }
      
      // Add controls
      this.setupControls();
      
      // Add virtual controls for mobile devices
      if (this.isMobile) {
        this.addVirtualControls();
      }
      
      // Create game status display
      const statusDisplay = document.createElement('div');
      statusDisplay.id = 'game-status';
      statusDisplay.classList.add('p-2', 'text-center', 'text-sm', 'mt-2', 'bg-blue-500', 'text-white', 'rounded');
      statusDisplay.style.display = this.debugMode ? 'block' : 'none';
      statusDisplay.innerText = 'Game initialized';
      this.container.appendChild(statusDisplay);
      
      // Create payment button
      const payButton = document.createElement('button');
      payButton.id = 'pay-button';
      payButton.classList.add('bg-yellow-400', 'text-black', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4', 'mb-4', 'mx-auto', 'block');
      payButton.innerText = 'Pay 0.1 MON to Play';
      payButton.onclick = () => this.payGameFee();
      this.container.appendChild(payButton);
      
      // Create start button (hidden initially)
      const startButton = document.createElement('button');
      startButton.classList.add('bg-green-500', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4', 'mb-4', 'mx-auto', 'block', 'hidden');
      startButton.id = 'start-button';
      startButton.innerText = 'Start Game';
      startButton.onclick = () => this.startGame();
      this.container.appendChild(startButton);
      
      // Create score display
      const scoreDisplay = document.createElement('div');
      scoreDisplay.id = 'score-display';
      scoreDisplay.classList.add('text-yellow-400', 'text-2xl', 'font-bold', 'text-center', 'mt-4');
      scoreDisplay.innerText = 'Score: 0';
      this.container.appendChild(scoreDisplay);
      
      // Show message
      this.showMessage('Sign in with Warpcast and pay 0.1 MON to play');
      
      this.log('Game interface initialized');
      this.showStatus('Ready to play');
      return true;
    } catch (error) {
      this.log(`Initialization error: ${error.message}`);
      this.container.innerHTML = `
        <div class="bg-red-600 text-white p-4 rounded text-center">
          Error initializing game: ${error.message || 'Unknown error'}
          <button id="retry-game" class="mt-2 bg-yellow-500 hover:bg-yellow-700 text-black font-bold py-2 px-4 rounded">
            Retry
          </button>
        </div>
      `;
      
      document.getElementById('retry-game')?.addEventListener('click', () => {
        window.location.reload();
      });
      
      return false;
    }
  }
  
  loadAssets() {
    this.log('Loading assets...');
    
    // Check if assets directory exists
    try {
      // Try to load images
      this.images.pacmanRight = new Image();
      this.images.pacmanRight.src = '/assets/pacman-right.png';
      
      this.images.pacmanLeft = new Image();
      this.images.pacmanLeft.src = '/assets/pacman-left.png';
      
      this.images.pacmanUp = new Image();
      this.images.pacmanUp.src = '/assets/pacman-up.png';
      
      this.images.pacmanDown = new Image();
      this.images.pacmanDown.src = '/assets/pacman-down.png';
      
      this.images.pacmanClosed = new Image();
      this.images.pacmanClosed.src = '/assets/pacman-closed.png';
      
      this.images.ghostRed = new Image();
      this.images.ghostRed.src = '/assets/ghost-red.png';
      
      this.images.ghostPink = new Image();
      this.images.ghostPink.src = '/assets/ghost-pink.png';
      
      this.images.ghostBlue = new Image();
      this.images.ghostBlue.src = '/assets/ghost-blue.png';
      
      this.images.ghostOrange = new Image();
      this.images.ghostOrange.src = '/assets/ghost-orange.png';
      
      this.images.ghostVulnerable = new Image();
      this.images.ghostVulnerable.src = '/assets/ghost-vulnerable.png';
      
      this.images.dot = new Image();
      this.images.dot.src = '/assets/dot.png';
      
      this.images.powerPellet = new Image();
      this.images.powerPellet.src = '/assets/power-pellet.png';
      
      this.images.wall = new Image();
      this.images.wall.src = '/assets/wall-piece.png';
      
      // Load sounds - with error handling for mobile
      try {
        // Only load sounds if not on mobile (many mobile browsers block autoplay)
        if (!this.isMobile) {
          this.sounds.start = new Audio('/assets/start.mp3');
          this.sounds.munch = new Audio('/assets/munch.mp3');
          this.sounds.powerPellet = new Audio('/assets/power-pellet.mp3');
          this.sounds.ghostEaten = new Audio('/assets/ghost-eaten.mp3');
          this.sounds.death = new Audio('/assets/death.mp3');
          this.sounds.levelComplete = new Audio('/assets/level-complete.mp3');
          
          // Preload sounds
          Object.values(this.sounds).forEach(sound => {
            if (sound) sound.load();
          });
        }
      } catch (error) {
        this.log(`Sound loading error: ${error.message}`);
        // Continue without sounds
      }
      
      // Set a flag for using images
      this.images.pacmanRight.onload = () => {
        this.assetsLoaded = true;
        this.log('Assets loaded successfully');
      };
      
      this.images.pacmanRight.onerror = () => {
        this.log('Failed to load image assets, falling back to canvas drawing');
        this.assetsLoaded = false;
      };
    } catch (error) {
      this.log(`Asset loading error: ${error.message}`);
      this.assetsLoaded = false;
    }
  }
  
  addVirtualControls() {
    const controlsContainer = document.createElement('div');
    controlsContainer.classList.add('virtual-controls', 'mt-4', 'mb-4');
    controlsContainer.style.display = 'grid';
    controlsContainer.style.gridTemplateColumns = 'repeat(3, 1fr)';
    controlsContainer.style.gridGap = '10px';
    controlsContainer.style.maxWidth = '240px';
    controlsContainer.style.margin = '0 auto';
    
    // Create control buttons
    const directions = [
      { position: 'top', text: '↑', key: 'ArrowUp', gridArea: '1 / 2 / 2 / 3' },
      { position: 'left', text: '←', key: 'ArrowLeft', gridArea: '2 / 1 / 3 / 2' },
      { position: 'right', text: '→', key: 'ArrowRight', gridArea: '2 / 3 / 3 / 4' },
      { position: 'bottom', text: '↓', key: 'ArrowDown', gridArea: '3 / 2 / 4 / 3' }
    ];
    
    directions.forEach(dir => {
      const button = document.createElement('button');
      button.innerText = dir.text;
      button.style.gridArea = dir.gridArea;
      button.classList.add('bg-blue-500', 'hover:bg-blue-700', 'text-white', 'font-bold', 'py-3', 'px-4', 'rounded-full', 'text-2xl');
      
      // Store reference to the button
      this.virtualButtons[dir.key] = button;
      
      // Touch events
      button.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.keys[dir.key] = true;
        button.classList.add('bg-blue-700');
      }, { passive: false });
      
      button.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.keys[dir.key] = false;
        button.classList.remove('bg-blue-700');
      }, { passive: false });
      
      // Mouse events (for testing on desktop)
      button.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.keys[dir.key] = true;
        button.classList.add('bg-blue-700');
      });
      
      button.addEventListener('mouseup', (e) => {
        e.preventDefault();
        this.keys[dir.key] = false;
        button.classList.remove('bg-blue-700');
      });
      
      button.addEventListener('mouseleave', (e) => {
        e.preventDefault();
        this.keys[dir.key] = false;
        button.classList.remove('bg-blue-700');
      });
      
      controlsContainer.appendChild(button);
    });
    
    this.container.appendChild(controlsContainer);
  }
  
  playSound(soundName) {
    if (this.sounds[soundName] && this.sounds[soundName].play) {
      try {
        this.sounds[soundName].currentTime = 0;
        this.sounds[soundName].play().catch(error => {
          this.log(`Sound play error (${soundName}): ${error.message}`);
        });
      } catch (error) {
        this.log(`Sound play error (${soundName}): ${error.message}`);
      }
    }
  }
  
  showStatus(message, isError = false) {
    const statusDiv = document.getElementById('game-status');
    if (statusDiv) {
      statusDiv.innerText = message;
      statusDiv.className = isError 
        ? 'p-2 text-center text-sm mt-2 bg-red-600 text-white rounded'
        : 'p-2 text-center text-sm mt-2 bg-blue-500 text-white rounded';
      
      if (!this.debugMode) {
        statusDiv.style.display = 'none';
      }
    }
    this.log(message);
  }
  
  setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (Object.keys(this.keys).includes(e.key)) {
        e.preventDefault(); // Prevent scrolling with arrow keys
        this.keys[e.key] = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (Object.keys(this.keys).includes(e.key)) {
        e.preventDefault();
        this.keys[e.key] = false;
      }
    });
    
    // Swipe controls for mobile
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (!this.gameStarted || this.gameOver) return;
      
      this.touchStartX = e.touches[0].clientX;
      this.touchStartY = e.touches[0].clientY;
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.gameStarted || this.gameOver) return;
      
      const touchX = e.touches[0].clientX;
      const touchY = e.touches[0].clientY;
      
      const diffX = touchX - this.touchStartX;
      const diffY = touchY - this.touchStartY;
      
      // Only register a swipe if it's a significant movement
      const minSwipeDistance = 30;
      
      if (Math.abs(diffX) > minSwipeDistance || Math.abs(diffY) > minSwipeDistance) {
        // Reset all keys first
        this.keys.ArrowLeft = false;
        this.keys.ArrowRight = false;
        this.keys.ArrowUp = false;
        this.keys.ArrowDown = false;
        
        // Determine swipe direction
        if (Math.abs(diffX) > Math.abs(diffY)) {
          // Horizontal swipe
          if (diffX > 0) {
            this.pacman.direction = 'right';
            this.keys.ArrowRight = true;
          } else {
            this.pacman.direction = 'left';
            this.keys.ArrowLeft = true;
          }
        } else {
          // Vertical swipe
          if (diffY > 0) {
            this.pacman.direction = 'down';
            this.keys.ArrowDown = true;
          } else {
            this.pacman.direction = 'up';
            this.keys.ArrowUp = true;
          }
        }
        
        // Update touch starting position for continued swiping
        this.touchStartX = touchX;
        this.touchStartY = touchY;
      }
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      // Keep the current direction active for better mobile gameplay
    }, { passive: false });
  }
  
  async payGameFee() {
    // Prevent multiple clicks
    if (this.paymentInProgress) return;
    
    const payButton = document.getElementById('pay-button');
    if (payButton) {
      payButton.disabled = true;
      payButton.innerText = 'Processing...';
      payButton.classList.add('opacity-50');
    }
    
    this.paymentInProgress = true;
    this.showStatus('Processing payment...');
    
    if (this.debugMode) {
      this.log('Debug mode: Bypassing payment process');
      this.gamePaid = true;
      this.showMessage('Payment successful! Click Start to play.');
      document.getElementById('start-button').classList.remove('hidden');
      this.showStatus('Payment successful (debug mode)');
      
      if (payButton) {
        payButton.classList.add('hidden');
      }
      
      this.paymentInProgress = false;
      return;
    }
    
    try {
      // Ensure user is signed in
      if (!this.auth.isSignedIn) {
        this.showStatus('Not signed in, attempting to sign in...', true);
        try {
          const signedIn = await this.auth.signIn();
          if (!signedIn) {
            throw new Error('Sign-in failed');
          }
        } catch (error) {
          this.showMessage('Failed to sign in with Warpcast. Please try again.');
          this.showStatus('Sign-in failed', true);
          this.paymentInProgress = false;
          
          if (payButton) {
            payButton.disabled = false;
            payButton.innerText = 'Pay 0.1 MON to Play';
            payButton.classList.remove('opacity-50');
          }
          
          return;
        }
      }
      
      // Get user information
      const fid = this.auth.getUserFid();
      const username = this.auth.getUserName();
      
      if (!fid || !username) {
        this.showMessage('Could not get user information. Please try again.');
        this.showStatus('User information not available', true);
        this.paymentInProgress = false;
        
        if (payButton) {
          payButton.disabled = false;
          payButton.innerText = 'Pay 0.1 MON to Play';
          payButton.classList.remove('opacity-50');
        }
        
        return;
      }
      
      this.showStatus(`Processing payment for FID: ${fid}, Username: ${username}`);
      this.showMessage('Waiting for wallet confirmation...');
      
      try {
        // Call contract to pay game fee
        const tx = await this.contract.payGameFee(fid, username, {
          value: ethers.utils.parseEther('0.1')
        });
        
        this.showStatus('Transaction sent, waiting for confirmation...');
        this.showMessage('Transaction sent! Waiting for confirmation...');
        
        // Wait for transaction confirmation
        await tx.wait();
        
        this.gamePaid = true;
        this.showMessage('Payment successful! Click Start to play.');
        document.getElementById('start-button').classList.remove('hidden');
        this.showStatus('Payment confirmed successfully');
        
        // Hide payment button after successful payment
        if (payButton) {
          payButton.classList.add('hidden');
        }
      } catch (error) {
        console.error('Error paying game fee:', error);
        this.showMessage(`Payment failed: ${error.message || 'Transaction rejected'}`);
        this.showStatus(`Payment error: ${error.message}`, true);
        
        if (payButton) {
          payButton.disabled = false;
          payButton.innerText = 'Pay 0.1 MON to Play';
          payButton.classList.remove('opacity-50');
        }
      }
    } catch (error) {
      console.error('Payment process error:', error);
      this.showMessage(`Payment process error: ${error.message || 'Unknown error'}`);
      this.showStatus(`Payment process error: ${error.message}`, true);
      
      if (payButton) {
        payButton.disabled = false;
        payButton.innerText = 'Pay 0.1 MON to Play';
        payButton.classList.remove('opacity-50');
      }
    } finally {
      this.paymentInProgress = false;
    }
  }
  
  startGame() {
    // Strict payment enforcement
    if (!this.gamePaid && !this.debugMode) {
      this.showMessage('Please pay 0.1 MON to play.');
      this.showStatus('Game not paid for', true);
      return;
    }
    
    // Hide start button during gameplay
    const startButton = document.getElementById('start-button');
    if (startButton) {
      startButton.classList.add('hidden');
    }
    
    this.showStatus('Starting game...');
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.level = 1;
    
    // Play start sound
    this.playSound('start');
    
    // Initialize game board
    this.initializeLevel();
    
    // Start game loop with framerate control
    this.lastFrameTime = performance.now();
    this.gameLoop();
    
    // Hide message
    this.hideMessage();
    
    // Update score display
    this.updateScoreDisplay();
    
    this.showStatus('Game started - Level 1');
  }
  
  initializeLevel() {
    // Reset arrays
    this.dots = [];
    this.powerPellets = [];
    this.ghosts = [];
    
    // Initialize walls (simple maze layout)
    this.walls = this.createWalls();
    
    // Place Pacman
    this.pacman.x = 50;
    this.pacman.y = 50;
    
    // Create dots
    this.createDots();
    
    // Create power pellets
    this.createPowerPellets();
    
    // Create ghosts
    this.createGhosts();
    
    // Adjust difficulty based on level
    this.adjustDifficulty();
    
    this.log(`Level ${this.level} initialized`);
  }
  
  createWalls() {
    const walls = [];
    
    // Outer walls
    for (let x = 0; x < this.gameWidth; x += 20) {
      walls.push({ x, y: 0, width: 20, height: 20 });
      walls.push({ x, y: this.gameHeight - 20, width: 20, height: 20 });
    }
    
    for (let y = 0; y < this.gameHeight; y += 20) {
      walls.push({ x: 0, y, width: 20, height: 20 });
      walls.push({ x: this.gameWidth - 20, y, width: 20, height: 20 });
    }
    
    // Inner walls (simple maze pattern)
    walls.push({ x: 100, y: 100, width: 100, height: 20 });
    walls.push({ x: 300, y: 100, width: 100, height: 20 });
    walls.push({ x: 100, y: 200, width: 20, height: 100 });
    walls.push({ x: 400, y: 200, width: 20, height: 100 });
    walls.push({ x: 200, y: 300, width: 100, height: 20 });
    
    return walls;
  }
  
  createDots() {
    // Create a grid of dots, avoiding walls and power pellet positions
    const gridSize = 40;
    
    for (let x = gridSize; x < this.gameWidth; x += gridSize) {
      for (let y = gridSize; y < this.gameHeight; y += gridSize) {
        // Skip if position is inside a wall
        if (this.isCollidingWithWalls(x, y, this.dotSize)) continue;
        
        // Add dot
        this.dots.push({ x, y, size: this.dotSize, value: this.dotValue });
      }
    }
  }
  
  createPowerPellets() {
    // Add power pellets to the corners of the playable area
    const margin = 60;
    
    this.powerPellets.push(
      { x: margin, y: margin, size: this.powerPelletSize, value: this.powerPelletValue },
      { x: this.gameWidth - margin, y: margin, size: this.powerPelletSize, value: this.powerPelletValue },
      { x: margin, y: this.gameHeight - margin, size: this.powerPelletSize, value: this.powerPelletValue },
      { x: this.gameWidth - margin, y: this.gameHeight - margin, size: this.powerPelletSize, value: this.powerPelletValue }
    );
  }
  
  createGhosts() {
    const ghostColors = ['#FF0000', '#00FFFF', '#FFB8FF', '#FFB852'];
    const ghostSize = 25;
    
    // Base ghost speed increases with level
    const baseSpeed = 2 + (this.level - 1) * 0.5;
    
    for (let i = 0; i < 4; i++) {
      this.ghosts.push({
        x: 300 + i * 40,
        y: 200,
        size: ghostSize,
        speed: baseSpeed + Math.random() * 0.5, // Slight speed variation
        direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
        color: ghostColors[i],
        vulnerable: false
      });
    }
  }
  
  adjustDifficulty() {
    // Increase ghost speed with level
    for (const ghost of this.ghosts) {
      ghost.speed = 2 + (this.level - 1) * 0.5 + Math.random() * 0.5;
    }
    
    // Make ghosts smarter at higher levels
    // This is a simple implementation - at higher levels, ghosts occasionally target Pacman
  }
  
  gameLoop(timestamp) {
    if (!this.gameStarted || this.gameOver) return;
    
    // Framerate control
    if (!timestamp) timestamp = performance.now();
    const elapsed = timestamp - this.lastFrameTime;
    
    // Limit to ~60 FPS
    if (elapsed > 1000 / this.fps) {
      this.lastFrameTime = timestamp;
      
      // Clear canvas
      this.ctx.fillStyle = 'black';
      this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
      
      // Update game state
      this.update();
      
      // Draw game elements
      this.draw();
    }
    
    // Continue game loop
    requestAnimationFrame((time) => this.gameLoop(time));
  }
  
  update() {
    // Update Pacman position based on keyboard/touch input
    this.updatePacman();
    
    // Update ghost positions
    this.updateGhosts();
    
    // Check collisions
    this.checkCollisions();
    
    // Check if level is complete
    if (this.dots.length === 0 && this.powerPellets.length === 0) {
      this.nextLevel();
    }
  }
  
  updatePacman() {
    // Move pacman based on active keys
    let newX = this.pacman.x;
    let newY = this.pacman.y;
    
    if (this.keys.ArrowLeft) {
      newX -= this.pacman.speed;
      this.pacman.direction = 'left';
    } else if (this.keys.ArrowRight) {
      newX += this.pacman.speed;
      this.pacman.direction = 'right';
    } else if (this.keys.ArrowUp) {
      newY -= this.pacman.speed;
      this.pacman.direction = 'up';
    } else if (this.keys.ArrowDown) {
      newY += this.pacman.speed;
      this.pacman.direction = 'down';
    }
    
    // Check if new position is valid (not colliding with walls)
    if (!this.isCollidingWithWalls(newX, newY, this.pacman.size / 2)) {
      this.pacman.x = newX;
      this.pacman.y = newY;
    }
    
    // Animate mouth (slower on mobile)
    if (Math.random() > (this.isMobile ? 0.8 : 0.5)) {
      this.pacman.mouthOpen = !this.pacman.mouthOpen;
    }
  }
  
  updateGhosts() {
    for (const ghost of this.ghosts) {
      let newX = ghost.x;
      let newY = ghost.y;
      
      // Move ghost based on its current direction
      switch (ghost.direction) {
        case 'left':
          newX -= ghost.speed;
          break;
        case 'right':
          newX += ghost.speed;
          break;
        case 'up':
          newY -= ghost.speed;
          break;
        case 'down':
          newY += ghost.speed;
          break;
      }
      
      // If ghost would collide with a wall, choose a new random direction
      if (this.isCollidingWithWalls(newX, newY, ghost.size / 2)) {
        const possibleDirections = ['up', 'down', 'left', 'right'];
        ghost.direction = possibleDirections[Math.floor(Math.random() * 4)];
      } else {
        ghost.x = newX;
        ghost.y = newY;
      }

      // At higher levels, occasionally target Pacman (smarter ghosts)
      if (this.level > 2 && Math.random() < 0.05 * (this.level - 1)) {
        if (ghost.x < this.pacman.x) {
          ghost.direction = 'right';
        } else if (ghost.x > this.pacman.x) {
          ghost.direction = 'left';
        } else if (ghost.y < this.pacman.y) {
          ghost.direction = 'down';
        } else if (ghost.y > this.pacman.y) {
          ghost.direction = 'up';
        }
      }
    }
  }
  
  checkCollisions() {
    // Check collision with dots
    for (let i = this.dots.length - 1; i >= 0; i--) {
      const dot = this.dots[i];
      const distance = Math.sqrt(
        Math.pow(this.pacman.x - dot.x, 2) + 
        Math.pow(this.pacman.y - dot.y, 2)
      );
      
      if (distance < this.pacman.size / 2 + dot.size) {
        // Collect dot
        this.score += dot.value;
        this.dots.splice(i, 1);
        this.updateScoreDisplay();
        this.playSound('munch');
      }
    }
    
    // Check collision with power pellets
    for (let i = this.powerPellets.length - 1; i >= 0; i--) {
      const pellet = this.powerPellets[i];
      const distance = Math.sqrt(
        Math.pow(this.pacman.x - pellet.x, 2) + 
        Math.pow(this.pacman.y - pellet.y, 2)
      );
      
      if (distance < this.pacman.size / 2 + pellet.size) {
        // Collect power pellet
        this.score += pellet.value;
        this.powerPellets.splice(i, 1);
        this.updateScoreDisplay();
        this.playSound('powerPellet');
        
        // Make ghosts vulnerable
        for (const ghost of this.ghosts) {
          ghost.vulnerable = true;
          ghost.color = '#0000FF'; // Blue for vulnerable ghosts
        }
        
        // Reset vulnerability after a few seconds
        setTimeout(() => {
          for (const ghost of this.ghosts) {
            if (ghost.vulnerable) {
              ghost.vulnerable = false;
              // Reset original colors
              const index = this.ghosts.indexOf(ghost);
              ghost.color = ['#FF0000', '#00FFFF', '#FFB8FF', '#FFB852'][index % 4];
            }
          }
        }, 5000);
      }
    }
    
    // Check collision with ghosts
    for (let i = 0; i < this.ghosts.length; i++) {
      const ghost = this.ghosts[i];
      const distance = Math.sqrt(
        Math.pow(this.pacman.x - ghost.x, 2) + 
        Math.pow(this.pacman.y - ghost.y, 2)
      );
      
      if (distance < this.pacman.size / 2 + ghost.size / 2) {
        if (ghost.vulnerable) {
          // Eat the ghost
          this.score += 200;
          this.updateScoreDisplay();
          this.playSound('ghostEaten');
          
          // Reset ghost position
          ghost.x = 300 + i * 40;
          ghost.y = 200;
          ghost.vulnerable = false;
          
          // Reset original colors
          const index = this.ghosts.indexOf(ghost);
          ghost.color = ['#FF0000', '#00FFFF', '#FFB8FF', '#FFB852'][index % 4];
        } else {
          // Game over - Pacman caught by ghost
          this.endGame();
        }
      }
    }
  }
  
  isCollidingWithWalls(x, y, radius) {
    for (const wall of this.walls) {
      // Check if the circle (pacman/ghost) intersects with the rectangle (wall)
      const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.width));
      const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.height));
      
      const distance = Math.sqrt(
        Math.pow(x - closestX, 2) + 
        Math.pow(y - closestY, 2)
      );
      
      if (distance < radius) {
        return true;
      }
    }
    
    return false;
  }
  
  draw() {
    // Draw walls
    this.ctx.fillStyle = '#0000FF'; // Blue walls
    for (const wall of this.walls) {
      if (this.assetsLoaded && this.images.wall && this.images.wall.complete) {
        // Use wall image if available
        const wallImg = this.images.wall;
        for (let x = wall.x; x < wall.x + wall.width; x += 20) {
          for (let y = wall.y; y < wall.y + wall.height; y += 20) {
            this.ctx.drawImage(
              wallImg,
              x,
              y,
              Math.min(20, wall.x + wall.width - x),
              Math.min(20, wall.y + wall.height - y)
            );
          }
        }
      } else {
        // Fallback to rectangle
        this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
      }
    }
    
    // Draw dots
    this.ctx.fillStyle = '#FFFFFF'; // White dots
    for (const dot of this.dots) {
      if (this.assetsLoaded && this.images.dot && this.images.dot.complete) {
        this.ctx.drawImage(
          this.images.dot,
          dot.x - dot.size,
          dot.y - dot.size,
          dot.size * 2,
          dot.size * 2
        );
      } else {
        this.ctx.beginPath();
        this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Draw power pellets
    this.ctx.fillStyle = '#FFFFFF'; // White power pellets
    for (const pellet of this.powerPellets) {
      if (this.assetsLoaded && this.images.powerPellet && this.images.powerPellet.complete) {
        this.ctx.drawImage(
          this.images.powerPellet,
          pellet.x - pellet.size,
          pellet.y - pellet.size,
          pellet.size * 2,
          pellet.size * 2
        );
      } else {
        this.ctx.beginPath();
        this.ctx.arc(pellet.x, pellet.y, pellet.size, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Draw ghosts
    for (const ghost of this.ghosts) {
      this.drawGhost(ghost);
    }
    
    // Draw Pacman
    this.drawPacman();
    
    // Draw level indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = this.isMobile ? '12px Arial' : '16px "Press Start 2P", Arial';
    this.ctx.fillText(`Level: ${this.level}`, 20, 20);
  }
  
  drawPacman() {
    if (this.assetsLoaded) {
      // Use pacman images if available
      let pacmanImg;
      
      if (!this.pacman.mouthOpen) {
        if (this.images.pacmanClosed && this.images.pacmanClosed.complete) {
          pacmanImg = this.images.pacmanClosed;
        }
      } else {
        switch (this.pacman.direction) {
          case 'right':
            if (this.images.pacmanRight && this.images.pacmanRight.complete) 
              pacmanImg = this.images.pacmanRight;
            break;
          case 'left':
            if (this.images.pacmanLeft && this.images.pacmanLeft.complete) 
              pacmanImg = this.images.pacmanLeft;
            break;
          case 'up':
            if (this.images.pacmanUp && this.images.pacmanUp.complete) 
              pacmanImg = this.images.pacmanUp;
            break;
          case 'down':
            if (this.images.pacmanDown && this.images.pacmanDown.complete) 
              pacmanImg = this.images.pacmanDown;
            break;
          default:
            if (this.images.pacmanRight && this.images.pacmanRight.complete) 
              pacmanImg = this.images.pacmanRight;
        }
      }
      
      if (pacmanImg) {
        // Draw the pacman image
        this.ctx.drawImage(
          pacmanImg,
          this.pacman.x - this.pacman.size / 2,
          this.pacman.y - this.pacman.size / 2,
          this.pacman.size,
          this.pacman.size
        );
        return;
      }
    }
    
    // Fallback to canvas drawing if images not available
    this.ctx.fillStyle = this.pacman.color;
    this.ctx.beginPath();
    
    // Calculate mouth angle based on direction
    let startAngle = 0;
    let endAngle = Math.PI * 2;
    
    if (this.pacman.mouthOpen) {
      switch (this.pacman.direction) {
        case 'right':
          startAngle = 0.2 * Math.PI;
          endAngle = 1.8 * Math.PI;
          break;
        case 'left':
          startAngle = 1.2 * Math.PI;
          endAngle = 0.8 * Math.PI;
          break;
        case 'up':
          startAngle = 1.7 * Math.PI;
          endAngle = 1.3 * Math.PI;
          break;
        case 'down':
          startAngle = 0.7 * Math.PI;
          endAngle = 0.3 * Math.PI;
          break;
      }
    }
    
    this.ctx.arc(
      this.pacman.x, 
      this.pacman.y, 
      this.pacman.size / 2, 
      startAngle, 
      endAngle
    );
    
    if (this.pacman.mouthOpen) {
      this.ctx.lineTo(this.pacman.x, this.pacman.y);
    }
    
    this.ctx.fill();
    
    // Draw eye
    this.ctx.fillStyle = 'black';
    
    let eyeX, eyeY;
    
    switch (this.pacman.direction) {
      case 'right':
        eyeX = this.pacman.x + 5;
        eyeY = this.pacman.y - 10;
        break;
      case 'left':
        eyeX = this.pacman.x - 5;
        eyeY = this.pacman.y - 10;
        break;
      case 'up':
        eyeX = this.pacman.x + 10;
        eyeY = this.pacman.y - 5;
        break;
      case 'down':
        eyeX = this.pacman.x + 10;
        eyeY = this.pacman.y + 5;
        break;
      default:
        eyeX = this.pacman.x + 5;
        eyeY = this.pacman.y - 10;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  drawGhost(ghost) {
    if (this.assetsLoaded) {
      // Use ghost images if available
      let ghostImg;
      
      if (ghost.vulnerable && this.images.ghostVulnerable && this.images.ghostVulnerable.complete) {
        ghostImg = this.images.ghostVulnerable;
      } else {
        switch (ghost.color) {
          case '#FF0000': // Red
            if (this.images.ghostRed && this.images.ghostRed.complete) 
              ghostImg = this.images.ghostRed;
            break;
          case '#FFB8FF': // Pink
            if (this.images.ghostPink && this.images.ghostPink.complete) 
              ghostImg = this.images.ghostPink;
            break;
          case '#00FFFF': // Blue/Cyan
            if (this.images.ghostBlue && this.images.ghostBlue.complete) 
              ghostImg = this.images.ghostBlue;
            break;
          case '#FFB852': // Orange
            if (this.images.ghostOrange && this.images.ghostOrange.complete) 
              ghostImg = this.images.ghostOrange;
            break;
          default:
            if (ghost.vulnerable && this.images.ghostVulnerable && this.images.ghostVulnerable.complete) {
              ghostImg = this.images.ghostVulnerable;
            } else if (this.images.ghostRed && this.images.ghostRed.complete) {
              ghostImg = this.images.ghostRed;
            }
        }
      }
      
      if (ghostImg) {
        // Draw the ghost image
        this.ctx.drawImage(
          ghostImg,
          ghost.x - ghost.size / 2,
          ghost.y - ghost.size / 2,
          ghost.size,
          ghost.size
        );
        return;
      }
    }
    
    // Fallback to canvas drawing if images not available
    this.ctx.fillStyle = ghost.color;
    
    // Draw ghost body (semicircle on top of rectangle)
    this.ctx.beginPath();
    this.ctx.arc(
      ghost.x,
      ghost.y - ghost.size / 4,
      ghost.size / 2,
      Math.PI,
      0
    );
    
    // Rectangle part
    this.ctx.rect(
      ghost.x - ghost.size / 2,
      ghost.y - ghost.size / 4,
      ghost.size,
      ghost.size / 2
    );
    
    // Wavy bottom
    this.ctx.moveTo(ghost.x - ghost.size / 2, ghost.y + ghost.size / 4);
    
    for (let i = 0; i < 3; i++) {
      this.ctx.quadraticCurveTo(
        ghost.x - ghost.size / 2 + (ghost.size / 3) * i + ghost.size / 6,
        ghost.y + ghost.size / 2,
        ghost.x - ghost.size / 2 + (ghost.size / 3) * (i + 1),
        ghost.y + ghost.size / 4
      );
    }
    
    this.ctx.fill();
    
    // Draw eyes
    this.ctx.fillStyle = 'white';
    
    this.ctx.beginPath();
    this.ctx.arc(
      ghost.x - ghost.size / 5,
      ghost.y - ghost.size / 5,
      ghost.size / 6,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(
      ghost.x + ghost.size / 5,
      ghost.y - ghost.size / 5,
      ghost.size / 6,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    // Draw pupils
    this.ctx.fillStyle = 'black';
    
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;
    
    switch (ghost.direction) {
      case 'right':
        pupilOffsetX = ghost.size / 12;
        break;
      case 'left':
        pupilOffsetX = -ghost.size / 12;
        break;
      case 'up':
        pupilOffsetY = -ghost.size / 12;
        break;
      case 'down':
        pupilOffsetY = ghost.size / 12;
        break;
    }
    
    this.ctx.beginPath();
    this.ctx.arc(
      ghost.x - ghost.size / 5 + pupilOffsetX,
      ghost.y - ghost.size / 5 + pupilOffsetY,
      ghost.size / 12,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.arc(
      ghost.x + ghost.size / 5 + pupilOffsetX,
      ghost.y - ghost.size / 5 + pupilOffsetY,
      ghost.size / 12,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
  }
  
  updateScoreDisplay() {
    const scoreDisplay = document.getElementById('score-display');
    if (scoreDisplay) {
      scoreDisplay.innerText = `Score: ${this.score}`;
    }
  }
  
  showMessage(message) {
    let messageDiv = document.getElementById('game-message');
    if (!messageDiv) {
      messageDiv = document.createElement('div');
      messageDiv.id = 'game-message';
      messageDiv.classList.add('bg-black', 'bg-opacity-80', 'text-white', 'p-4', 'rounded', 'absolute', 'top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2', 'text-center', 'min-w-[300px]', 'z-10');
      this.container.appendChild(messageDiv);
    }
    
    messageDiv.innerText = message;
    messageDiv.style.display = 'block';
    this.log(`Message displayed: ${message}`);
  }
  
  hideMessage() {
    const messageDiv = document.getElementById('game-message');
    if (messageDiv) {
      messageDiv.style.display = 'none';
    }
  }
  
  nextLevel() {
    this.level += 1;
    this.showStatus(`Completed level ${this.level - 1}`);
    
    // Play level complete sound
    this.playSound('levelComplete');
    
    // Show level transition message
    this.showMessage(`Level ${this.level}`);
    
    // Initialize next level after a short delay
    setTimeout(() => {
      this.initializeLevel();
      this.hideMessage();
      this.showStatus(`Playing level ${this.level}`);
    }, 2000);
  }
  
  async endGame() {
    this.gameOver = true;
    this.gameStarted = false;
    
    // Play death sound
    this.playSound('death');
    
    // Show game over message
    this.showMessage(`Game Over! Final Score: ${this.score}`);
    this.showStatus(`Game over - Score: ${this.score}`);
    
    // Submit score to blockchain
    if (!this.debugMode) {
      await this.submitScore();
    } else {
      this.log(`Debug mode: Score ${this.score} would be submitted`);
      setTimeout(() => {
        this.showMessage(`Game Over! Score: ${this.score} (Debug Mode)`);
      }, 2000);
    }
    
    // Reset game and show Start button
    setTimeout(() => {
      const startButton = document.getElementById('start-button');
      if (startButton) {
        startButton.classList.remove('hidden');
      }
      
      // If game wasn't paid for (debug mode), show payment button again
      if (this.debugMode) {
        const payButton = document.getElementById('pay-button');
        if (payButton && payButton.classList.contains('hidden')) {
          payButton.classList.remove('hidden');
          payButton.disabled = false;
          payButton.innerText = 'Pay 0.1 MON to Play';
          payButton.classList.remove('opacity-50');
          this.gamePaid = false;
        }
      }
    }, 3000);
  }
  
  async submitScore() {
    if (!this.auth.isSignedIn) {
      this.showStatus('Not signed in, cannot submit score', true);
      return;
    }
    
    try {
      const fid = this.auth.getUserFid();
      
      if (!fid) {
        this.showStatus('No FID available, cannot submit score', true);
        return;
      }
      
      // Submit score to blockchain
      this.showStatus(`Submitting score: ${this.score} for FID: ${fid}`);
      this.showMessage(`Submitting score to blockchain...`);
      
      try {
        const tx = await this.contract.updateScore(fid, this.score);
        this.showStatus('Transaction sent, waiting for confirmation...');
        this.showMessage('Score transaction sent. Waiting for confirmation...');
        
        await tx.wait();
        
        this.showStatus('Score submitted successfully');
        this.showMessage(`Game Over! Score ${this.score} submitted to leaderboard.`);
      } catch (error) {
        this.showStatus(`Error submitting transaction: ${error.message}`, true);
        this.showMessage(`Game Over! Failed to submit score: ${error.message}`);
        
        if (this.debugMode) {
          this.log(`Would have submitted score: ${this.score} for FID: ${fid}`);
        }
      }
    } catch (error) {
      this.showStatus(`Score submission error: ${error.message}`, true);
      this.showMessage('Game Over! Failed to submit score. Please try again.');
    }
  }
  
  // Handle window resize for responsive gameplay
  handleResize() {
    if (this.isMobile) {
      const newWidth = Math.min(window.innerWidth - 30, 600);
      const newHeight = Math.min(window.innerHeight * 0.5, 500);
      
      // Only resize if significantly different
      if (Math.abs(newWidth - this.gameWidth) > 50 || Math.abs(newHeight - this.gameHeight) > 50) {
        this.gameWidth = newWidth;
        this.gameHeight = newHeight;
        
        // Update canvas dimensions
        this.canvas.width = this.gameWidth;
        this.canvas.height = this.gameHeight;
        
        // Reinitialize game elements if game is in progress
        if (this.gameStarted && !this.gameOver) {
          this.initializeLevel();
        }
      }
    }
  }
}