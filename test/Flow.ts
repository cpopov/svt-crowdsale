import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai, { expect } from 'chai';
import dayjs from 'dayjs';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { ethers, getChainId, network, run, waffle } from 'hardhat';
import ExampleCrowdSaleArtifact from '../artifacts/contracts/ExampleCrowdSale.sol/ExampleCrowdSale.json';
import ExampleTokenArtifact from '../artifacts/contracts/ExampleToken.sol/ExampleToken.json';
import ExampleVestingVaultArtifact from '../artifacts/contracts/ExampleVestingVault.sol/ExampleVestingVault.json';
import ExampleVestingWalletArtifact from '../artifacts/contracts/ExampleVestingWallet.sol/ExampleVestingWallet.json';
import { ExampleCrowdSale } from '../typechain-types/contracts/ExampleCrowdSale';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';
import { ExampleVestingVault } from '../typechain-types/contracts/ExampleVestingVault';
import { ExampleVestingWallet } from '../typechain-types/contracts/ExampleVestingWallet';
const { deployContract } = waffle;
chai.use(solidity);

describe('Flow', function () {
  let exampleToken: ExampleToken;
  let exampleCrowdSale: ExampleCrowdSale;
  let exampleCrowdSalePhase2: ExampleCrowdSale;
  let exampleVestingVault: ExampleVestingVault;
  let exampleVestingWallet: ExampleVestingWallet;
  const initialSupply: BigNumber = BigNumber.from('3765000000').mul(BigNumber.from('10').pow(18));
  const projectfund: BigNumber = BigNumber.from('2000000000').mul(BigNumber.from('10').pow(18));
  let adminUser: SignerWithAddress;
  let userOne: SignerWithAddress;
  let userTwo: SignerWithAddress;
  let wallet: SignerWithAddress;
  let now: number;
  let tokensAmountTransferredPhase2: BigNumber;
  type Vesting = {
    tokenAmount: BigNumber;
    releaseTime: BigNumber;
    beneficiary: BigNumber;
  };

  before(async function () {
    [adminUser, wallet, userOne, userTwo] = await ethers.getSigners();
  });

  it('can deploy the token', async () => {
    exampleToken = (await deployContract(adminUser, ExampleTokenArtifact, [
      'ExampleToken',
      'ET',
      initialSupply,
      wallet.address,
    ])) as ExampleToken;

    expect(await exampleToken.totalSupply()).to.equal(initialSupply);
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(initialSupply);
    expect(await exampleToken.hasRole(await exampleToken.DEFAULT_ADMIN_ROLE(), adminUser.address)).to.be.true;
  });

  it('can deploy the vesting wallet', async () => {
    now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
    exampleVestingWallet = (await deployContract(adminUser, ExampleVestingWalletArtifact, [
      wallet.address,
      now,
      3600 * 24 * 365 * 10, // 10% per year = 10 years
    ])) as ExampleVestingWallet;

    expect(await exampleVestingWallet.beneficiary()).to.equal(wallet.address);
    expect(await exampleVestingWallet.beneficiary()).to.not.equal(adminUser.address);
  });

  it('can add tokens to the vesting wallet', async () => {
    await exampleToken.connect(wallet).transfer(exampleVestingWallet.address, projectfund);
    expect(await exampleVestingWallet.beneficiary()).to.equal(wallet.address);
    expect(await exampleVestingWallet.beneficiary()).to.not.equal(adminUser.address);
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(initialSupply.sub(projectfund));
    expect(await exampleToken.balanceOf(exampleVestingWallet.address)).to.equal(projectfund);
  });

  it('can deploy the vesting vault', async () => {
    exampleVestingVault = (await deployContract(adminUser, ExampleVestingVaultArtifact, [
      exampleToken.address,
    ])) as ExampleVestingVault;

    expect(await exampleVestingVault.token()).to.equal(exampleToken.address);

    const vestings = (await exampleVestingVault.vestingFor(wallet.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));
    expect(totalTokenAmount).to.equal(0);
  });

  it('can deploy the first phase of the crowdsale', async () => {
    const pricefeed = await run('chainlink-pricefeed', {
      chainid: await getChainId(),
    });
    exampleCrowdSale = (await deployContract(adminUser, ExampleCrowdSaleArtifact, [
      pricefeed,
      exampleToken.address,
      wallet.address,
      250,
      dayjs().add(30, 'months').unix(),
      exampleVestingVault.address,
    ])) as ExampleCrowdSale;

    expect(await exampleCrowdSale.tokensAvailable()).to.equal(0);
    expect(await exampleCrowdSale.fundsRaised()).to.equal(0);
  });

  it('can enable the crowdsale contract on the vault', async () => {
    await exampleVestingVault.grantRole(await exampleVestingVault.VAULT_CONTROLLER_ROLE(), exampleCrowdSale.address);
    expect(
      await exampleVestingVault.hasRole(await exampleVestingVault.VAULT_CONTROLLER_ROLE(), exampleCrowdSale.address)
    ).to.be.true;
  });

  it('userOne should have funds', async () => {
    expect(await userOne.getBalance()).to.be.gt(0);
  });

  it('fails when the user is not whitelisted', async () => {
    expect(
      userOne.sendTransaction({
        to: exampleCrowdSale.address,
        value: BigNumber.from(10).mul(BigNumber.from(10).pow(18)),
      })
    ).to.be.reverted;
  });

  it('can whitelist user one', async () => {
    const role = await exampleCrowdSale.WHITELISTED_ROLE();
    await exampleCrowdSale.grantRole(role, userOne.address);
    expect(await exampleCrowdSale.hasRole(role, userOne.address)).to.be.true;
  });

  it('fails when the crowdsale has no tokens yet', async () => {
    expect(
      userOne.sendTransaction({
        to: exampleCrowdSale.address,
        value: BigNumber.from(10).mul(BigNumber.from(10).pow(18)),
      })
    ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
  });

  it('can be loaded up with tokens', async () => {
    const amount = BigNumber.from(100000000).mul(BigNumber.from(10).pow(18));
    await exampleToken.connect(wallet).transfer(exampleCrowdSale.address, amount);
    expect(await exampleCrowdSale.tokensAvailable()).to.equal(amount);
    expect(await exampleCrowdSale.fundsRaised()).to.equal(0);
  });

  it('works when the crowdsale has tokens', async () => {
    const amount = BigNumber.from(100000000).mul(BigNumber.from(10).pow(18));
    await userOne.sendTransaction({
      to: exampleCrowdSale.address,
      value: BigNumber.from(10).mul(BigNumber.from(10).pow(18)),
    });
    expect(await exampleCrowdSale.tokensAvailable()).to.be.lt(amount);
    expect(await exampleCrowdSale.fundsRaised()).to.equal(BigNumber.from(10).mul(BigNumber.from(10).pow(18)));
    expect(await wallet.getBalance()).to.be.gt(BigNumber.from(100).mul(BigNumber.from(10).pow(18)));
    expect(await exampleToken.balanceOf(exampleVestingVault.address)).to.equal(
      amount.sub(await exampleCrowdSale.tokensAvailable())
    );

    const vestings = (await exampleVestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));
    expect(totalTokenAmount).to.equal(amount.sub(await exampleCrowdSale.tokensAvailable()));
  });

  it('the project fund vesting can be released', async () => {
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(
      initialSupply.sub(projectfund).sub(BigNumber.from(100000000).mul(BigNumber.from(10).pow(18)))
    );

    const fiveYearsIntoTheFuture = now + 5 * 365 * 24 * 60 * 60;
    const vestedAmount = await exampleVestingWallet['vestedAmount(address,uint64)'](
      exampleToken.address,
      fiveYearsIntoTheFuture
    );
    expect(vestedAmount).to.gte(projectfund.div(2));

    // Set current time to be after releaseTime
    await network.provider.send('evm_setNextBlockTimestamp', [fiveYearsIntoTheFuture]);

    expect(await exampleVestingWallet['release(address)'](exampleToken.address))
      .to.emit(exampleVestingWallet, 'ERC20Released')
      .withArgs(exampleToken.address, vestedAmount);
    expect(await exampleToken.balanceOf(exampleVestingWallet.address)).to.equal(projectfund.sub(vestedAmount));
  });

  it('users can release their tokens after release time is enabled', async () => {
    const vestings = (await exampleVestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));

    expect(await exampleVestingVault.connect(userOne).release()).to.emit(exampleVestingVault, 'VestingReleased');
  });

  it('users cannot release same tokens twice', async () => {
    expect(exampleVestingVault.connect(userOne).release()).to.be.revertedWith('VestingVault: Cannot release 0 tokens');
  });

  // Second phase of the crowdsale

  it('can deploy the second phase of the crowdsale', async () => {
    now = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;

    const pricefeed = await run('chainlink-pricefeed', {
      chainid: await getChainId(),
    });

    exampleCrowdSalePhase2 = (await deployContract(adminUser, ExampleCrowdSaleArtifact, [
      pricefeed,
      exampleToken.address,
      wallet.address,
      250,
      dayjs().add(30, 'months').unix(),
      exampleVestingVault.address,
    ])) as ExampleCrowdSale;

    expect(await exampleCrowdSalePhase2.tokensAvailable()).to.equal(0);
    expect(await exampleCrowdSalePhase2.fundsRaised()).to.equal(0);
  });

  it('can enable the second phase of the crowdsale contract on the vault', async () => {
    await exampleVestingVault.grantRole(
      await exampleVestingVault.VAULT_CONTROLLER_ROLE(),
      exampleCrowdSalePhase2.address
    );
    expect(
      await exampleVestingVault.hasRole(
        await exampleVestingVault.VAULT_CONTROLLER_ROLE(),
        exampleCrowdSalePhase2.address
      )
    ).to.be.true;
  });

  it('userOne should have funds', async () => {
    expect(await userOne.getBalance()).to.be.gt(0);
  });

  it('can whitelist user one', async () => {
    const role = await exampleCrowdSalePhase2.WHITELISTED_ROLE();
    await exampleCrowdSalePhase2.grantRole(role, userOne.address);
    expect(await exampleCrowdSalePhase2.hasRole(role, userOne.address)).to.be.true;
  });

  it('can be loaded up with tokens', async () => {
    const amount = BigNumber.from(100000000).mul(BigNumber.from(10).pow(18));
    await exampleToken.connect(wallet).transfer(exampleCrowdSalePhase2.address, amount);
    expect(await exampleCrowdSalePhase2.tokensAvailable()).to.equal(amount);
    expect(await exampleCrowdSalePhase2.fundsRaised()).to.equal(0);
  });

  it('works when the crowdsale has tokens', async () => {
    const amount = await exampleCrowdSalePhase2.tokensAvailable();
    const vestingVaultBalanceBeforeTxn = await exampleToken.balanceOf(exampleVestingVault.address);
    const valueTransferred = BigNumber.from(10).mul(BigNumber.from(10).pow(18));

    await userOne.sendTransaction({
      to: exampleCrowdSalePhase2.address,
      value: valueTransferred,
    });

    tokensAmountTransferredPhase2 = amount.sub(await exampleCrowdSalePhase2.tokensAvailable());
    const vestingVaultBalanceAfterTxn = vestingVaultBalanceBeforeTxn.add(tokensAmountTransferredPhase2);

    expect(await exampleCrowdSalePhase2.tokensAvailable()).to.be.lt(amount);
    expect(await exampleCrowdSalePhase2.fundsRaised()).to.equal(valueTransferred);
    expect(await wallet.getBalance()).to.be.gt(BigNumber.from(100).mul(BigNumber.from(10).pow(18)));
    expect(await exampleToken.balanceOf(exampleVestingVault.address)).to.equal(vestingVaultBalanceAfterTxn);

    const vestings = (await exampleVestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));
    expect(totalTokenAmount).to.equal(tokensAmountTransferredPhase2);
  });

  it('userOne should have funds', async () => {
    expect(await userOne.getBalance()).to.be.gt(0);
  });

  it('user can participate multiple times', async () => {
    const amount = await exampleCrowdSalePhase2.tokensAvailable();
    const vestingVaultBalanceBeforeTxn = await exampleToken.balanceOf(exampleVestingVault.address);
    const valueTransferred = BigNumber.from(10).mul(BigNumber.from(10).pow(18));
    const crowdSalePhase2FundsBeforeTxn = await exampleCrowdSalePhase2.fundsRaised();
    const vestingsBeforeTxn = (await exampleVestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmountBeforeTxn: BigNumber = BigNumber.from(0);
    vestingsBeforeTxn.map((vest) => (totalTokenAmountBeforeTxn = totalTokenAmountBeforeTxn.add(vest.tokenAmount)));

    await userOne.sendTransaction({
      to: exampleCrowdSalePhase2.address,
      value: valueTransferred,
    });

    tokensAmountTransferredPhase2 = tokensAmountTransferredPhase2.add(
      amount.sub(await exampleCrowdSalePhase2.tokensAvailable())
    );
    const vestingVaultBalanceAfterTxn = vestingVaultBalanceBeforeTxn.add(
      amount.sub(await exampleCrowdSalePhase2.tokensAvailable())
    );

    expect(await exampleCrowdSalePhase2.tokensAvailable()).to.be.lt(amount);
    expect(await exampleCrowdSalePhase2.fundsRaised()).to.equal(crowdSalePhase2FundsBeforeTxn.add(valueTransferred));
    expect(await wallet.getBalance()).to.be.gt(BigNumber.from(100).mul(BigNumber.from(10).pow(18)));
    expect(await exampleToken.balanceOf(exampleVestingVault.address)).to.equal(vestingVaultBalanceAfterTxn);

    const vestings = (await exampleVestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));
    expect(totalTokenAmount).to.equal(tokensAmountTransferredPhase2);
  });

  it('users can release their tokens after release time is enabled', async () => {
    expect(await exampleVestingVault.connect(userOne).release()).to.emit(exampleVestingVault, 'VestingReleased');
  });

  it('users cannot release same tokens twice', async () => {
    expect(exampleVestingVault.connect(userOne).release()).to.be.revertedWith('VestingVault: Cannot release 0 tokens');
  });
});
