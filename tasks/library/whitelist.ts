import chalk from 'chalk';
import { ethers } from 'ethers';
import { readFileSync, writeFileSync } from 'fs';
import { task } from 'hardhat/config';
import keccak256 from 'keccak256';
import MerkleTree from 'merkletreejs';
task('whitelist', 'Generates the whitelist MerkleRoot and proofs').setAction(async () => {
  const whitelist: Record<string, string> = JSON.parse(readFileSync('./assets/whitelist.json', 'utf8'));

  console.log('');
  console.log(chalk.gray.dim('--------------------------------------------------------------------------'));
  console.log(`Building Merkle Tree for ${chalk.yellow.bold(Object.keys(whitelist).length)} registered accounts:`);

  const whiteListLeaves: Record<string, Buffer> = {};
  for (const [address, amount] of Object.entries(whitelist)) {
    whiteListLeaves[address] = Buffer.from(
      ethers.utils.solidityKeccak256(['address', 'string'], [address, amount]).slice(2),
      'hex'
    );
  }

  const whitelistTree = new MerkleTree(Object.values(whiteListLeaves), keccak256, { sortPairs: true });

  const whitelistProofs: Record<string, { allowance: string; proof: string[] }> = {};
  for (const [address, amount] of Object.entries(whitelist)) {
    whitelistProofs[address] = {
      allowance: amount,
      proof: whitelistTree.getHexProof(whiteListLeaves[address]),
    };
  }

  const whitelistRoot = whitelistTree.getHexRoot();
  console.log(`  Merkle Root: ${chalk.green.bold(whitelistRoot)}`);
  writeFileSync(
    './assets/generated/whitelist.json',
    JSON.stringify(
      {
        root: whitelistRoot,
        proofs: whitelistProofs,
      },
      null,
      2
    )
  );
  console.log(`  Export: ${chalk.green.bold('./assets/generated/whitelist.json')}`);

  console.log(chalk.gray.dim('--------------------------------------------------------------------------'));
  console.log('');

  return {
    root: whitelistRoot,
    proofs: whitelistProofs,
  };
});
