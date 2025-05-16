import { sdk } from '@farcaster/frame-sdk';

export default class Auth {
  constructor() {
    this.user = null;
    this.isSignedIn = false;
    this.isWarpcast = false;
  }

  async init() {
    try {
      console.log("Initializing Auth...");
      
      // Try to detect if we're running in Warpcast
      try {
        // Check if we're in a Farcaster Mini App
        const isInMiniApp = await sdk.isInMiniApp();
        console.log("Is in Mini App according to SDK:", isInMiniApp);
        
        if (isInMiniApp) {
          this.isWarpcast = true;
          
          // In Warpcast, user is already authenticated through the app
          try {
            // Try to get user context from SDK
            const context = sdk.context;
            if (context && context.user) {
              this.user = context.user;
              this.isSignedIn = true;
              console.log("Got Warpcast user from context:", this.user);
            } else {
              // Fallback user if no context
              this.user = { fid: 123456, username: "warpcast_user" };
              this.isSignedIn = true;
              console.log("Using fallback Warpcast user");
            }
          } catch (err) {
            console.warn("Error getting user context:", err);
            // Fallback for errors
            this.user = { fid: 999999, username: "warpcast_user" };
            this.isSignedIn = true;
          }
          
          // In Warpcast, we consider auth successful no matter what
          return true;
        }
      } catch (error) {
        console.warn("Error checking Mini App status:", error);
        
        // Fallback detection methods
        try {
          const context = sdk.context;
          if (context && (context.client || context.user)) {
            this.isWarpcast = true;
            if (context.user) {
              this.user = context.user;
              this.isSignedIn = true;
            } else {
              this.user = { fid: 888888, username: "warpcast_fallback" };
              this.isSignedIn = true;
            }
            return true;
          }
        } catch (e) {
          console.warn("Error checking context:", e);
        }
      }
      
      // If we're here, we're NOT in Warpcast
      // For web version, auth will happen on-demand when signIn is called
      console.log("Not in Warpcast - will authenticate with MetaMask when needed");
      return true;
    } catch (error) {
      console.error("Auth initialization error:", error);
      // Return true anyways to not block the app
      return true;
    }
  }

  async signIn() {
    // Already signed in
    if (this.isSignedIn) {
      console.log("Already signed in:", this.user);
      return true;
    }
    
    // In Warpcast - we're already signed in through the app
    if (this.isWarpcast) {
      if (!this.user) {
        this.user = { fid: 777777, username: "warpcast_auto" };
      }
      this.isSignedIn = true;
      return true;
    }
    
    // Web version - use wallet connection as "sign in"
    try {
      // Check if we can access the wallet
      if (!window.ethereum) {
        console.error("No wallet detected");
        return false;
      }
      
      // Request accounts
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      if (accounts && accounts.length > 0) {
        const address = accounts[0];
        console.log("Connected to wallet:", address);
        
        // Create a user object with the wallet address
        this.user = {
          fid: 0, // Not a real FID
          username: `${address.substring(0, 6)}...${address.substring(38)}`,
          address: address
        };
        
        this.isSignedIn = true;
        
        // Update UI
        if (document.getElementById('user-info')) {
          document.getElementById('user-info').innerText = `Signed in as: ${this.user.username}`;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Sign-in error:", error);
      return false;
    }
  }

  getUserFid() {
    return this.user ? (this.user.fid || 0) : 0;
  }

  getUserName() {
    if (!this.user) return null;
    
    return this.user.username || 
           this.user.displayName || 
           (this.user.address ? `${this.user.address.substring(0, 6)}...` : "Unknown");
  }
}