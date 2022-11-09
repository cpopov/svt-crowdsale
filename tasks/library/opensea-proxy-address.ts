import { task } from 'hardhat/config';

task('opensea-proxy-address', 'Returns the OpenSea Proxy address for a network')
  .addParam<string>('chainid', 'the chainID of the network to deploy on')
  .setAction(async ({ chainid }: { chainid: string }) => {
    let proxyRegistryAddress = '0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101'; // Polygon
    if (chainid === '4') {
      // rinkeby
      proxyRegistryAddress = '0xf57b2c51ded3a29e6891aba85459d600256cf317';
    } else if (chainid === '137') {
      // polygon
      proxyRegistryAddress = '0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101';
    } else if (chainid === '80001') {
      // polygon mumbai
      proxyRegistryAddress = '0x207Fa8Df3a17D96Ca7EA4f2893fcdCb78a304101';
    } else if (chainid === '1') {
      // mainnet
      proxyRegistryAddress = '0xa5409ec958c83c3f309868babaca7c86dcb077c1';
    }
    return proxyRegistryAddress;
  });
