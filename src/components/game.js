export default class PacmanGame {
  constructor(containerId, authInstance, contract) {
    this.container = document.getElementById(containerId);
    this.auth = authInstance;
    this.contract = contract;
    this.canvas = null;
    this.ctx = null;
    this.score = 0;
    this.gameOver = false;
    this.gameStarted = false;
    this.level = 1;
    this.gamePaid = false;
    
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
    this.gameWidth = 600;
    this.gameHeight = 500;
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
  }
  
  async init() {
    // Create canvas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.gameWidth;
    this.canvas.height = this.gameHeight;
    this.canvas.style.border = '4px solid blue';
    this.canvas.style.backgroundColor = 'black';
    this.canvas.style.display = 'block';
    this.canvas.style.margin = '0 auto';
    
    this.ctx = this.canvas.getContext('2d');
    this.container.appendChild(this.canvas);
    
    // Add controls
    this.setupControls();
    
    // Create payment button
    const payButton = document.createElement('button');
    payButton.classList.add('bg-yellow-400', 'text-black', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4', 'mb-4', 'mx-auto', 'block');
    payButton.innerText = 'Pay 0.1 MON to Play';
    payButton.onclick = () => this.payGameFee();
    this.container.appendChild(payButton);
    
    // Create start button
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
  }
  
  setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (Object.keys(this.keys).includes(e.key)) {
        this.keys[e.key] = true;
      }
    });
    
    window.addEventListener('keyup', (e) => {
      if (Object.keys(this.keys).includes(e.key)) {
        this.keys[e.key] = false;
      }
    });
    
    // Mobile touch controls
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
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
      
      // Determine swipe direction
      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swipe
        if (diffX > 0) {
          this.pacman.direction = 'right';
        } else {
          this.pacman.direction = 'left';
        }
      } else {
        // Vertical swipe
        if (diffY > 0) {
          this.pacman.direction = 'down';
        } else {
          this.pacman.direction = 'up';
        }
      }
      
      this.touchStartX = touchX;
      this.touchStartY = touchY;
    }, { passive: false });
  }
  
  async payGameFee() {
    if (!this.auth.isSignedIn) {
      const signedIn = await this.auth.signIn();
      if (!signedIn) {
        this.showMessage('Failed to sign in with Warpcast. Please try again.');
        return;
      }
    }
    
    try {
      const fid = this.auth.getUserFid();
      const username = this.auth.getUserName();
      
      if (!fid || !username) {
        this.showMessage('Could not get user information. Please try again.');
        return;
      }
      
      // Call contract to pay game fee
      const tx = await this.contract.payGameFee(fid, username, {
        value: ethers.utils.parseEther('0.1')
      });
      
      // Wait for transaction confirmation
      await tx.wait();
      
      this.gamePaid = true;
      this.showMessage('Payment successful! Click Start to play.');
      document.getElementById('start-button').classList.remove('hidden');
    } catch (error) {
      console.error('Error paying game fee:', error);
      this.showMessage('Failed to process payment. Please try again.');
    }
  }
  
  startGame() {
    if (!this.gamePaid) {
      this.showMessage('Please pay 0.1 MON to play.');
      return;
    }
    
    this.gameStarted = true;
    this.gameOver = false;
    this.score = 0;
    this.level = 1;
    
    // Initialize game board
    this.initializeLevel();
    
    // Start game loop
    this.gameLoop();
    
    // Hide message
    this.hideMessage();
    
    // Update score display
    this.updateScoreDisplay();
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
  
  gameLoop() {
    if (!this.gameStarted || this.gameOver) return;
    
    // Clear canvas
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.gameWidth, this.gameHeight);
    
    // Update game state
    this.update();
    
    // Draw game elements
    this.draw();
    
    // Continue game loop
    requestAnimationFrame(() => this.gameLoop());
  }
  
  update() {
    // Update Pacman position based on keyboard input
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
    // Move pacman based on keys pressed
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
    
    // Animate mouth
    this.pacman.mouthOpen = !this.pacman.mouthOpen;
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
        
        // Make ghosts vulnerable
        for (const ghost of this.ghosts) {
          ghost.vulnerable = true;
          ghost.color = '#0000FF'; // Blue for vulnerable ghosts
        }
        
        // Reset vulnerability after a few seconds
        setTimeout(() => {
          for (const ghost of this.ghosts) {
            ghost.vulnerable = false;
            // Reset original colors
            const index = this.ghosts.indexOf(ghost);
            ghost.color = ['#FF0000', '#00FFFF', '#FFB8FF', '#FFB852'][index % 4];
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
      // Continue the checkCollisions method in game.js
      if (distance < this.pacman.size / 2 + ghost.size / 2) {
        if (ghost.vulnerable) {
          // Eat the ghost
          this.score += 200;
          this.updateScoreDisplay();
          
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
      this.ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }
    
    // Draw dots
    this.ctx.fillStyle = '#FFFFFF'; // White dots
    for (const dot of this.dots) {
      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw power pellets
    this.ctx.fillStyle = '#FFFFFF'; // White power pellets
    for (const pellet of this.powerPellets) {
      this.ctx.beginPath();
      this.ctx.arc(pellet.x, pellet.y, pellet.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw ghosts
    for (const ghost of this.ghosts) {
      this.drawGhost(ghost);
    }
    
    // Draw Pacman
    this.drawPacman();
    
    // Draw level indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '16px Arial';
    this.ctx.fillText(`Level: ${this.level}`, 20, 20);
  }
  
  drawPacman() {
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
    document.getElementById('score-display').innerText = `Score: ${this.score}`;
  }
  
  showMessage(message) {
    let messageDiv = document.getElementById('game-message');
    if (!messageDiv) {
      messageDiv = document.createElement('div');
      messageDiv.id = 'game-message';
      messageDiv.classList.add('bg-black', 'bg-opacity-80', 'text-white', 'p-4', 'rounded', 'absolute', 'top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2', 'text-center', 'min-w-[300px]');
      this.container.appendChild(messageDiv);
    }
    
    messageDiv.innerText = message;
    messageDiv.style.display = 'block';
  }
  
  hideMessage() {
    const messageDiv = document.getElementById('game-message');
    if (messageDiv) {
      messageDiv.style.display = 'none';
    }
  }
  
  nextLevel() {
    this.level += 1;
    
    // Show level transition message
    this.showMessage(`Level ${this.level}`);
    
    // Initialize next level after a short delay
    setTimeout(() => {
      this.initializeLevel();
      this.hideMessage();
    }, 2000);
  }
  
  async endGame() {
    this.gameOver = true;
    this.gameStarted = false;
    
    // Show game over message
    this.showMessage(`Game Over! Final Score: ${this.score}`);
    
    // Submit score to blockchain
    await this.submitScore();
    
    // Reset game
    setTimeout(() => {
      document.getElementById('start-button').classList.remove('hidden');
    }, 3000);
  }
  
  async submitScore() {
    if (!this.auth.isSignedIn) {
      console.error('Not signed in');
      return;
    }
    
    try {
      const fid = this.auth.getUserFid();
      
      if (!fid) {
        console.error('No FID available');
        return;
      }
      
      // Submit score to blockchain
      console.log(`Submitting score: ${this.score} for FID: ${fid}`);
      
      const tx = await this.contract.updateScore(fid, this.score);
      await tx.wait();
      
      console.log('Score submitted successfully');
      this.showMessage(`Game Over! Score submitted: ${this.score}`);
    } catch (error) {
      console.error('Error submitting score:', error);
      this.showMessage('Game Over! Failed to submit score. Please try again.');
    }
  }
}