import { sdk } from '@farcaster/frame-sdk';
import { generateNonce } from '../utils/crypto';

export default class Auth {
  constructor() {
    this.user = null;
    this.nonce = null;
    this.isSignedIn = false;
  }

  async init() {
    try {
      // Check if we're in a Farcaster Mini App context
      const isInMiniApp = await sdk.isInMiniApp();
      if (!isInMiniApp) {
        console.warn('Not running in Farcaster Mini App');
        document.getElementById('auth-warning').classList.remove('hidden');
        return false;
      }

      // Get user context
      const context = sdk.context;
      if (context && context.user && context.user.fid) {
        this.user = context.user;
        console.log('User context:', this.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return false;
    }
  }

  async signIn() {
    try {
      // Generate a secure nonce
      this.nonce = generateNonce();
      
      // Request Sign in with Farcaster
      const signInResult = await sdk.actions.signIn({
        nonce: this.nonce,
        acceptAuthAddress: true,
      });
      
      // Verify signature on server (in a full implementation)
      // For simplicity, we'll just check if we received a result
      if (signInResult && signInResult.message && signInResult.signature) {
        this.isSignedIn = true;
        
        // Display user info
        if (this.user) {
          document.getElementById('user-info').innerText = 
            `Signed in as: ${this.user.displayName || this.user.username || this.user.fid}`;
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error signing in:', error);
      return false;
    }
  }

  getUserFid() {
    return this.user ? this.user.fid : null;
  }

  getUserName() {
    return this.user ? (this.user.username || this.user.displayName || `FID: ${this.user.fid}`) : null;
  }
}