import dayjs from 'dayjs';
import { BigNumber } from 'ethers';
import { ethers, run } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';
import { ExampleVestingWallet } from '../typechain-types/contracts/ExampleVestingWallet';

const migrate: DeployFunction = async ({ getNamedAccounts, deployments: { deploy }, config, network }) => {
  const { deployer, wallet } = await getNamedAccounts();
  if (!deployer) {
    console.error(
      '\n\nERROR!\n\nThe node you are deploying to does not have access to a private key to sign this transaction. Add a Private Key in this application to solve this.\n\n'
    );
    process.exit(1);
  }

  const timestamp = dayjs().unix();
  const duration = 60 * 60 * 24 * 365;

  await deploy('ExampleVestingWallet', {
    from: deployer,
    args: [wallet, timestamp, duration],
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

  const token = await ethers.getContract<ExampleToken>('ExampleToken', wallet);
  const vestingWallet = await ethers.getContract<ExampleVestingWallet>('ExampleVestingWallet', wallet);
  await token.transfer(vestingWallet.address, BigNumber.from('2000000000').mul(BigNumber.from('10').pow(18)));

  return true;
};

export default migrate;

migrate.id = '01_deploy_vestingwallet';
migrate.tags = ['ExampleVestingWallet'];
