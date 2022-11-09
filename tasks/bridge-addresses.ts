import { task } from 'hardhat/config';

task('polygon-bridge-childchainmanager', 'Returns the Polygon Bridge Child Chain Manager address for a network')
  .addParam<string>('chainid', 'the chainID of the network to deploy on')
  .setAction(async ({ chainid }: { chainid: string }) => {
    let childchainmanager = '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa'; // Polygon
    if (chainid === '137') {
      // polygon
      childchainmanager = '0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa';
    } else if (chainid === '80001') {
      // polygon mumbai
      childchainmanager = '0xb5505a6d998549090530911180f38aC5130101c6';
    }
    return childchainmanager;
  });
