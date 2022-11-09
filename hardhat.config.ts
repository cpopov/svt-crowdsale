import { HardhatUserConfig } from 'hardhat/config';
import bpaasConfig from './.secrets/default.hardhat.config';
import './tasks/bridge-addresses';
import './tasks/library/compile-ui-info';
import './tasks/library/graph-config';
import './tasks/library/ipfs-cid';
import './tasks/library/ipfs-upload-file';
import './tasks/library/opensea-proxy-address';
import './tasks/library/whitelist';
import './tasks/pricefeed';

const config: HardhatUserConfig = {
  ...bpaasConfig,
  namedAccounts: {
    ...bpaasConfig.namedAccounts,
    wallet: {
      default: 0,
    },
  },
};

// If you want to pin your NFT assets, add a token here from https://nft.storage
export const nftStorageToken = '';

export default config;
