import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { ExampleCrowdSale } from '../typechain-types/contracts/ExampleCrowdSale';
import { ExampleVestingVault } from '../typechain-types/contracts/ExampleVestingVault';

const migrate: DeployFunction = async ({ getNamedAccounts }) => {
  const { deployer } = await getNamedAccounts();
  if (!deployer) {
    console.error(
      '\n\nERROR!\n\nThe node you are deploying to does not have access to a private key to sign this transaction. Add a Private Key in this application to solve this.\n\n'
    );
    process.exit(1);
  }

  const vestingVault = await ethers.getContract<ExampleVestingVault>('ExampleVestingVault');
  const crowdSale = await ethers.getContract<ExampleCrowdSale>('ExampleCrowdSale');

  const role = await vestingVault.VAULT_CONTROLLER_ROLE();
  await vestingVault.grantRole(role, crowdSale.address, { from: deployer });

  return true;
};

export default migrate;

migrate.id = '04_enable_crowdsale';
migrate.tags = ['ExampleCrowdSale'];
