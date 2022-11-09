import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';
import { DeployFunction } from 'hardhat-deploy/types';
import { ExampleCrowdSale } from '../typechain-types/contracts/ExampleCrowdSale';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';

const migrate: DeployFunction = async ({ getNamedAccounts }) => {
  const { deployer, wallet } = await getNamedAccounts();
  if (!deployer) {
    console.error(
      '\n\nERROR!\n\nThe node you are deploying to does not have access to a private key to sign this transaction. Add a Private Key in this application to solve this.\n\n'
    );
    process.exit(1);
  }

  const crowdSale = await ethers.getContract<ExampleCrowdSale>('ExampleCrowdSale', deployer);

  const token = await ethers.getContract<ExampleToken>('ExampleToken', wallet);
  await token.transfer(crowdSale.address, BigNumber.from('100000000').mul(BigNumber.from('10').pow(18)));
  return true;
};

export default migrate;

migrate.id = '05_fund_crowdsale';
migrate.tags = ['ExampleCrowdSale'];
