import dayjs from 'dayjs';
import { ethers, getChainId, run } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';
import { ExampleVestingVault } from '../typechain-types/contracts/ExampleVestingVault';

const migrate: DeployFunction = async ({ getNamedAccounts, deployments: { deploy }, config, network }) => {
  const { deployer, wallet } = await getNamedAccounts();
  if (!deployer) {
    console.error(
      '\n\nERROR!\n\nThe node you are deploying to does not have access to a private key to sign this transaction. Add a Private Key in this application to solve this.\n\n'
    );
    process.exit(1);
  }

  const pricefeed = await run('chainlink-pricefeed', {
    chainid: await getChainId(),
  });

  const token = await ethers.getContract<ExampleToken>('ExampleToken', deployer);
  const usdRate = 250;
  const vestingEndDate = dayjs().add(30, 'months').unix();
  const vestingVault = await ethers.getContract<ExampleVestingVault>('ExampleVestingVault', deployer);

  await deploy('ExampleCrowdSale', {
    from: deployer,
    args: [pricefeed, token.address, wallet, usdRate, vestingEndDate, vestingVault.address],
    log: true,
  });
  let hasEtherScanInstance = false;
  try {
    await run('verify:get-etherscan-endpoint');
    hasEtherScanInstance = true;
  } catch (e) {
    // ignore
  }
  if (hasEtherScanInstance) {
    await run('sourcify');
    if (!config.verify?.etherscan?.apiKey) {
      console.error(
        `\n\nERROR!\n\nYou have not set your Etherscan API key in your hardhat.config.ts file. Set it and run\n\nyarn hardhat --network '${network.name}' etherscan-verify\n\n`
      );
    } else {
      await new Promise((resolve) => {
        setTimeout(resolve, 10 * 1000);
      }); // allow etherscan to catch up
      await run('etherscan-verify');
    }
  }

  return true;
};

export default migrate;

migrate.id = '03_deploy_crowdsale';
migrate.tags = ['ExampleCrowdSale'];
