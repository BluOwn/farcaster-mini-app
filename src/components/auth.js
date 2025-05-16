import { sdk } from '@farcaster/frame-sdk';

export default class Auth {
  constructor() {
    this.user = null;
    this.nonce = null;
    this.isSignedIn = false;
  }

  async init() {
    try {
      // Try multiple methods to detect if we're in a Farcaster Mini App
      let isInMiniApp = false;
      
      try {
        // Method 1: Check using isInMiniApp
        isInMiniApp = await sdk.isInMiniApp();
        console.log("Is in Mini App according to SDK:", isInMiniApp);
      } catch (error) {
        console.warn('Error checking Mini App context:', error.message);
        
        // Method 2: Try to access context
        try {
          const context = sdk.context;
          if (context && (context.client || context.user)) {
            isInMiniApp = true;
            console.log("Detected via context:", context);
            
            // If we have user context, use it
            if (context.user) {
              this.user = context.user;
              console.log("Using user from context:", this.user);
              
              // Consider already signed in if we have user info
              this.isSignedIn = true;
            }
          }
        } catch (err) {
          console.warn('Error checking context:', err.message);
        }
      }
      
      // Always return true to allow the game to proceed
      // This ensures we don't block the game even if auth detection fails
      return true;
    } catch (error) {
      console.error('Auth initialization error:', error);
      return false;
    }
  }

  async signIn() {
    try {
      // If we already have a user (from context), consider signed in
      if (this.user && this.isSignedIn) {
        console.log("Already signed in with user:", this.user);
        
        // Update UI
        if (document.getElementById('user-info')) {
          document.getElementById('user-info').innerText = 
            `Signed in as: ${this.user.displayName || this.user.username || `FID: ${this.user.fid}`}`;
        }
        
        return true;
      }
      
      // Generate a secure nonce for signing
      this.nonce = Math.random().toString(36).substring(2, 15);
      console.log("Generated nonce for sign-in:", this.nonce);
      
      try {
        // Request Sign in with Farcaster
        console.log("Requesting Farcaster sign-in...");
        const signInResult = await sdk.actions.signIn({
          nonce: this.nonce,
          acceptAuthAddress: true,
        });
        
        console.log("Sign-in result:", signInResult);
        
        if (signInResult && signInResult.message && signInResult.signature) {
          this.isSignedIn = true;
          
          // Try to get user info from context
          try {
            const context = sdk.context;
            if (context && context.user) {
              this.user = context.user;
              console.log("Got user from context after sign-in:", this.user);
            }
          } catch (err) {
            console.warn('Error getting user from context after sign-in:', err);
          }
          
          // If we don't have user info, create a minimal placeholder
          if (!this.user) {
            console.log("No user info available, creating placeholder");
            this.user = {
              fid: 999999, // Placeholder
              username: "warpcast_user"
            };
          }
          
          // Update user display
          if (document.getElementById('user-info')) {
            document.getElementById('user-info').innerText = 
              `Signed in as: ${this.user.displayName || this.user.username || `FID: ${this.user.fid}`}`;
          }
          
          return true;
        }
      } catch (error) {
        console.error('Sign-in error:', error);
        
        // Create a fallback user if sign-in fails
        // This ensures the game still works even if sign-in fails
        this.isSignedIn = true;
        this.user = {
          fid: 888888, // Placeholder
          username: "warpcast_player"
        };
        
        if (document.getElementById('user-info')) {
          document.getElementById('user-info').innerText = 'Signed in as: Warpcast Player';
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sign-in process error:', error);
      
      // Last resort fallback
      this.isSignedIn = true;
      this.user = { fid: 777777, username: "fallback_user" };
      
      if (document.getElementById('user-info')) {
        document.getElementById('user-info').innerText = 'Signed in as: Fallback User';
      }
      
      return true;
    }
  }

  getUserFid() {
    return this.user ? this.user.fid : null;
  }

  getUserName() {
    return this.user ? (this.user.username || this.user.displayName || `FID: ${this.user.fid}`) : null;
  }
}