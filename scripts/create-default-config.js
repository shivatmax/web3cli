#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

try {
  // Determine this script's directory
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  // Example config is in the project root
  const exampleConfigPath = path.join(__dirname, '..', 'web3cli.example.toml');
  const destPath = path.resolve(process.cwd(), 'web3cli.toml');

  if (!fs.existsSync(destPath)) {
    fs.copyFileSync(exampleConfigPath, destPath);
    console.log('✨ Created default Web3CLI config: web3cli.toml');
  }
} catch (error) {
  console.error('⚠️  Could not create default config file:', error);
} 