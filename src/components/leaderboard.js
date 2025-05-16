export default class Leaderboard {
  constructor(containerId, contract, debugMode = false) {
    this.container = document.getElementById(containerId);
    this.contract = contract;
    this.leaderboardData = [];
    this.debugMode = debugMode;
    this.fetchCount = 0;
  }
  
  log(message) {
    if (this.debugMode) {
      console.log(`[Leaderboard] ${message}`);
    }
  }
  
  async init() {
    this.log('Initializing leaderboard');
    try {
      // Create leaderboard container
      const leaderboardDiv = document.createElement('div');
      leaderboardDiv.classList.add('bg-gray-900', 'p-4', 'rounded-lg', 'mt-8', 'shadow-lg', 'max-w-lg', 'mx-auto');
      
      // Create title
      const title = document.createElement('h2');
      title.classList.add('text-yellow-400', 'text-2xl', 'font-bold', 'text-center', 'mb-4');
      title.innerText = 'Leaderboard';
      leaderboardDiv.appendChild(title);
      
      // Add status indicator
      const status = document.createElement('div');
      status.id = 'leaderboard-status';
      status.classList.add('text-sm', 'text-center', 'mb-2', 'text-gray-400');
      status.innerText = 'Loading...';
      leaderboardDiv.appendChild(status);
      
      // Create leaderboard table
      const table = document.createElement('table');
      table.classList.add('w-full', 'text-white');
      
      // Create table header
      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr class="border-b border-gray-700">
          <th class="p-2 text-left">Rank</th>
          <th class="p-2 text-left">Player</th>
          <th class="p-2 text-right">Score</th>
        </tr>
      `;
      table.appendChild(thead);
      
      // Create table body
      const tbody = document.createElement('tbody');
      tbody.id = 'leaderboard-body';
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center">Loading leaderboard data...</td>
        </tr>
      `;
      table.appendChild(tbody);
      
      leaderboardDiv.appendChild(table);
      
      // Create refresh button
      const refreshButton = document.createElement('button');
      refreshButton.id = 'refresh-leaderboard';
      refreshButton.classList.add('bg-blue-500', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4', 'mx-auto', 'block');
      refreshButton.innerText = 'Refresh Leaderboard';
      refreshButton.onclick = () => this.fetchLeaderboard();
      leaderboardDiv.appendChild(refreshButton);
      
      // Add trophy icon indicators
      const legendDiv = document.createElement('div');
      legendDiv.classList.add('text-center', 'mt-2', 'text-sm', 'text-gray-400');
      legendDiv.innerHTML = `
        <span class="text-yellow-400">🏆 1st</span> &nbsp;
        <span class="text-gray-300">🥈 2nd</span> &nbsp;
        <span class="text-yellow-600">🥉 3rd</span>
      `;
      leaderboardDiv.appendChild(legendDiv);
      
      this.container.appendChild(leaderboardDiv);
      
      // Initial leaderboard fetch
      await this.fetchLeaderboard();
      return true;
    } catch (error) {
      this.log(`Initialization error: ${error.message}`);
      this.container.innerHTML = `
        <div class="bg-red-600 text-white p-4 rounded text-center mt-8">
          Error initializing leaderboard: ${error.message}
        </div>
      `;
      return false;
    }
  }
  
  setStatus(message, isError = false) {
    const status = document.getElementById('leaderboard-status');
    if (status) {
      status.innerText = message;
      status.className = isError 
        ? 'text-sm text-center mb-2 text-red-400'
        : 'text-sm text-center mb-2 text-gray-400';
    }
    this.log(message);
  }
  
  async fetchLeaderboard() {
    this.fetchCount++;
    const fetchId = this.fetchCount;
    this.setStatus(`Fetching leaderboard data... (${fetchId})`);
    
    const refreshButton = document.getElementById('refresh-leaderboard');
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.classList.add('opacity-50');
      refreshButton.innerText = 'Refreshing...';
    }
    
    try {
      // Show loading state
      document.getElementById('leaderboard-body').innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center">
            <div class="flex justify-center items-center">
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Loading leaderboard...</span>
            </div>
          </td>
        </tr>
      `;
      
      // Check if contract is available
      if (!this.contract || typeof this.contract.getTopPlayers !== 'function') {
        throw new Error('Contract connection not available');
      }
      
      // Fetch top 10 players from contract
      this.log('Calling contract.getTopPlayers(10)');
      const topPlayers = await this.contract.getTopPlayers(10);
      this.log(`Received ${topPlayers.length} players from contract`);
      
      // Process player data
      if (!topPlayers || topPlayers.length === 0) {
        this.leaderboardData = [];
        this.setStatus('No players found on the leaderboard');
      } else {
        // Map players data with proper error handling
        this.leaderboardData = topPlayers.map((player, index) => {
          try {
            return {
              rank: index + 1,
              username: player.username || `Player FID:${player.fid.toString()}`,
              fid: player.fid ? player.fid.toString() : 'Unknown',
              score: player.highScore ? player.highScore.toNumber() : 0
            };
          } catch (error) {
            this.log(`Error processing player data at index ${index}: ${error.message}`);
            return {
              rank: index + 1,
              username: 'Error',
              fid: 'Error',
              score: 0
            };
          }
        });
        
        // Sort by score in descending order
        this.leaderboardData.sort((a, b) => b.score - a.score);
        
        // Reassign ranks based on sorted order
        this.leaderboardData.forEach((player, index) => {
          player.rank = index + 1;
        });
        
        this.setStatus(`Loaded ${this.leaderboardData.length} players`);
      }
      
      this.updateLeaderboardUI();
    } catch (error) {
      this.log(`Error fetching leaderboard: ${error.message}`);
      this.setStatus(`Error loading leaderboard: ${error.message}`, true);
      document.getElementById('leaderboard-body').innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center text-red-400">
            Failed to load leaderboard: ${error.message}
            <br>
            <button id="retry-leaderboard" class="mt-2 bg-blue-500 text-white font-bold py-1 px-3 rounded text-sm">
              Retry
            </button>
          </td>
        </tr>
      `;
      
      // Add retry button functionality
      const retryButton = document.getElementById('retry-leaderboard');
      if (retryButton) {
        retryButton.onclick = () => this.fetchLeaderboard();
      }
    } finally {
      // Re-enable refresh button
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.classList.remove('opacity-50');
        refreshButton.innerText = 'Refresh Leaderboard';
      }
    }
  }
  
  updateLeaderboardUI() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) {
      this.log('Leaderboard body element not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (this.leaderboardData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center">
            No scores yet. Be the first to play!
          </td>
        </tr>
      `;
      return;
    }
    
    // Add row for each player
    this.leaderboardData.forEach(player => {
      const row = document.createElement('tr');
      row.classList.add('border-b', 'border-gray-800', 'hover:bg-gray-800');
      
      // Add rank styling for top 3
      let rankClass = '';
      let rankIcon = '';
      
      if (player.rank === 1) {
        rankClass = 'text-yellow-400 font-bold';
        rankIcon = '🏆 ';
      } else if (player.rank === 2) {
        rankClass = 'text-gray-300 font-bold';
        rankIcon = '🥈 ';
      } else if (player.rank === 3) {
        rankClass = 'text-yellow-600 font-bold';
        rankIcon = '🥉 ';
      }
      
      // Truncate username if too long
      const displayName = player.username?.length > 15 
        ? player.username.substring(0, 12) + '...' 
        : player.username || 'Unknown';
      
      row.innerHTML = `
        <td class="p-2 ${rankClass}">${rankIcon}${player.rank}</td>
        <td class="p-2 ${rankClass}" title="FID: ${player.fid}">${displayName}</td>
        <td class="p-2 text-right ${rankClass}">${player.score.toLocaleString()}</td>
      `;
      
      tbody.appendChild(row);
    });
    
    // Add loading animation for automatic refresh
    setTimeout(() => {
      if (this.container && this.container.parentNode) {
        this.fetchLeaderboard();
      }
    }, 60000); // Auto-refresh every minute
  }
  
  // Method to manually refresh from outside the class
  refresh() {
    this.fetchLeaderboard();
  }
}