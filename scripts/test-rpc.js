#!/usr/bin/env node
/**
 * Simple RPC connectivity test
 * Run periodically to check when network becomes available
 */

import { ethers } from 'ethers';

const RPCS = [
  { name: 'Polygon Amoy Official', url: 'https://rpc-amoy.polygon.technology' },
  { name: 'BlockPi Public', url: 'https://polygon-amoy.blockpi.network/v1/rpc/public' },
  { name: 'PublicNode Amoy', url: 'https://amoy.publicnode.com' },
  { name: 'QuickNode Amoy', url: 'https://lonely-spotted-brook.discover.quiknode.pro/7b8b7b7b7b7b7b7b/' }
];

async function testRPC(rpc) {
  try {
    const provider = new ethers.JsonRpcProvider(rpc.url);
    await Promise.race([
      provider.getNetwork(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
    ]);
    return { success: true, name: rpc.name, url: rpc.url };
  } catch (error) {
    return { success: false, name: rpc.name, url: rpc.url, error: error.message };
  }
}

async function main() {
  console.log('🔍 Testing Polygon Amoy RPC connectivity...\n');

  for (const rpc of RPCS) {
    const result = await testRPC(rpc);
    if (result.success) {
      console.log(`✅ ${result.name}`);
      console.log(`   URL: ${result.url}`);
      console.log(`\n🎉 At least one RPC is working! You can deploy now.`);
      console.log(`   Run: ./scripts/deploy-when-ready.sh\n`);
      process.exit(0);
    } else {
      console.log(`❌ ${result.name}: ${result.error}`);
    }
  }

  console.log('\n⚠️  All RPCs failed. Network not available.');
  console.log('Will retry in the next check cycle.\n');
  process.exit(1);
}

main().catch(console.error);
