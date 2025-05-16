// src/utils/ethers-config.js

import { createConfig, http } from 'wagmi';
import { farcasterFrame } from '@farcaster/frame-wagmi-connector';
import { monadTestnet } from './chains.js';

// Wagmi config
export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
  connectors: [
    farcasterFrame()
  ],
});

// Contract address (replace with your deployed contract address)
export const PACMAN_CONTRACT_ADDRESS = "0x5bCBB2d1d45c57a745c490d9e9421E0c05EdC778"; // Replace with your actual contract address