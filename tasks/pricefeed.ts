import { task } from 'hardhat/config';

task('chainlink-pricefeed', 'Returns the Chainlink pricefeed for a network')
  .addParam<string>('chainid', 'the chainID of the network to deploy on')
  .setAction(async ({ chainid }: { chainid: string }) => {
    let pricefeed = '0x0000000000000000000000000000000000000000'; // Polygon
    if (chainid === '137') {
      // polygon
      pricefeed = '0xAB594600376Ec9fD91F8e885dADF0CE036862dE0';
    } else if (chainid === '80001') {
      // polygon mumbai
      pricefeed = '0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada';
    }
    return pricefeed;
  });
