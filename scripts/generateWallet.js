#!/usr/bin/env node
/**
 * Generate New Wallet
 *
 * Creates a new Ethereum wallet for deployment.
 * Save the output securely - this is your only chance!
 */

import hre from 'hardhat'

async function main() {
  console.log('🔐 Generating New Wallet')
  console.log('========================\n')

  // Generate random wallet
  const wallet = hre.ethers.Wallet.createRandom()

  console.log('📋 Wallet Details:')
  console.log('-------------------')
  console.log(`Address: ${wallet.address}`)
  console.log(`Private Key: ${wallet.privateKey}`)
  console.log('')

  // Save to secure file (optional)
  const fs = await import('fs')
  const path = await import('path')
  const { fileURLToPath } = await import('url')

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const walletsDir = path.join(__dirname, '..', 'wallets')

  if (!fs.existsSync(walletsDir)) {
    fs.mkdirSync(walletsDir, { recursive: true })
  }

  const walletData = {
    address: wallet.address,
    created: new Date().toISOString()
  }

  fs.writeFileSync(
    path.join(walletsDir, 'new-wallet-address.json'),
    JSON.stringify(walletData, null, 2)
  )

  // DON'T save private key to file - it's a security risk!
  console.log('⚠️  SECURITY WARNING')
  console.log('--------------------')
  console.log('Private key shown above.')
  console.log('SAVE IT NOW - you cannot recover it!')
  console.log('')
  console.log('Transfer at least 0.1 MATIC to this address:')
  console.log(`   ${wallet.address}`)
  console.log('')
  console.log('📋 Next steps:')
  console.log('   1. COPY the private key NOW')
  console.log('   2. Send MATIC to the address above')
  console.log('   3. Export to MetaMask if needed')
  console.log('')
  console.log('💡 MetaMask import:')
  console.log('   Open MetaMask → Import Account → Paste private key')
}

main().catch(console.error)