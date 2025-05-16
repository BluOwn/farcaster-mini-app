export default class Leaderboard {
  constructor(containerId, contract) {
    this.container = document.getElementById(containerId);
    this.contract = contract;
    this.leaderboardData = [];
  }
  
  async init() {
    // Create leaderboard container
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.classList.add('bg-gray-900', 'p-4', 'rounded-lg', 'mt-8', 'shadow-lg', 'max-w-lg', 'mx-auto');
    
    // Create title
    const title = document.createElement('h2');
    title.classList.add('text-yellow-400', 'text-2xl', 'font-bold', 'text-center', 'mb-4');
    title.innerText = 'Leaderboard';
    leaderboardDiv.appendChild(title);
    
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
    table.appendChild(tbody);
    
    leaderboardDiv.appendChild(table);
    
    // Create refresh button
    const refreshButton = document.createElement('button');
    refreshButton.classList.add('bg-blue-500', 'text-white', 'font-bold', 'py-2', 'px-4', 'rounded', 'mt-4', 'mx-auto', 'block');
    refreshButton.innerText = 'Refresh Leaderboard';
    refreshButton.onclick = () => this.fetchLeaderboard();
    leaderboardDiv.appendChild(refreshButton);
    
    this.container.appendChild(leaderboardDiv);
    
    // Initial leaderboard fetch
    await this.fetchLeaderboard();
  }
  
  async fetchLeaderboard() {
    try {
      // Fetch top 10 players from contract
      const topPlayers = await this.contract.getTopPlayers(10);
      
      this.leaderboardData = topPlayers.map((player, index) => ({
        rank: index + 1,
        username: player.username,
        score: player.highScore.toNumber()
      }));
      
      this.updateLeaderboardUI();
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      document.getElementById('leaderboard-body').innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center text-red-400">Failed to load leaderboard. Please try again.</td>
        </tr>
      `;
    }
  }
  
  updateLeaderboardUI() {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';
    
    if (this.leaderboardData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="p-4 text-center">No scores yet. Be the first to play!</td>
        </tr>
      `;
      return;
    }
    
    this.leaderboardData.forEach(player => {
      const row = document.createElement('tr');
      row.classList.add('border-b', 'border-gray-800', 'hover:bg-gray-800');
      
      // Add rank styling for top 3
      let rankClass = '';
      if (player.rank === 1) {
        rankClass = 'text-yellow-400 font-bold';
      } else if (player.rank === 2) {
        rankClass = 'text-gray-300 font-bold';
      } else if (player.rank === 3) {
        rankClass = 'text-yellow-600 font-bold';
      }
      
      row.innerHTML = `
        <td class="p-2 ${rankClass}">${player.rank}</td>
        <td class="p-2 ${rankClass}">${player.username}</td>
        <td class="p-2 text-right ${rankClass}">${player.score.toLocaleString()}</td>
      `;
      
      tbody.appendChild(row);
    });
  }
}