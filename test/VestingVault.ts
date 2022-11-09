import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai, { expect } from 'chai';
import dayjs from 'dayjs';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { ethers, getChainId, network, run, waffle } from 'hardhat';
import CrowdSaleArtifact from '../artifacts/contracts/ExampleCrowdSale.sol/ExampleCrowdSale.json';
import TokenArtifact from '../artifacts/contracts/ExampleToken.sol/ExampleToken.json';
import VestingVaultArtifact from '../artifacts/contracts/ExampleVestingVault.sol/ExampleVestingVault.json';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';
import { VestingVault } from '../typechain-types/contracts/library/finance/vesting/VestingVault';
import { CrowdSale } from '../typechain-types/contracts/library/token/ERC20/crowdsale/CrowdSale';

const { deployContract } = waffle;
chai.use(solidity);

describe('VestingVault', function () {
  let token: ExampleToken;
  let vestingVault: VestingVault;
  let crowdSale: CrowdSale;
  let adminUser: SignerWithAddress;
  let userOne: SignerWithAddress;
  let userTwo: SignerWithAddress;
  let wallet: SignerWithAddress;
  const initialSupply: BigNumber = BigNumber.from('3765000000').mul(BigNumber.from('10').pow(18));
  const releaseTime = dayjs().add(30, 'months').unix();
  const tokenAmount = 1;
  const increaseTokensBy = 5;
  let newTokenAmount = tokenAmount + increaseTokensBy;
  type Vesting = {
    tokenAmount: BigNumber;
    releaseTime: BigNumber;
    beneficiary: BigNumber;
  };

  before(async function () {
    [adminUser, wallet, userOne, userTwo] = await ethers.getSigners();

    token = (await deployContract(adminUser, TokenArtifact, [
      'Token',
      'ET',
      initialSupply,
      wallet.address,
    ])) as ExampleToken;

    vestingVault = (await deployContract(adminUser, VestingVaultArtifact, [token.address])) as VestingVault;

    const pricefeed = await run('chainlink-pricefeed', {
      chainid: await getChainId(),
    });

    crowdSale = (await deployContract(adminUser, CrowdSaleArtifact, [
      pricefeed,
      token.address,
      wallet.address,
      250,
      releaseTime,
      vestingVault.address,
    ])) as CrowdSale;
  });

  it('has a token', async () => {
    expect(await vestingVault.token()).to.equal(token.address);
  });

  it('cannot add beneficiary if sender is not a vault controller', async () => {
    expect(vestingVault.addBeneficiary(userOne.address, releaseTime, tokenAmount)).to.be.reverted;
  });

  it('cannot grant vault controller role if sender is not admin', async () => {
    const role = await vestingVault.VAULT_CONTROLLER_ROLE();
    const userOneVestingVault = vestingVault.connect(userOne);
    expect(userOneVestingVault.grantRole(role, crowdSale.address)).to.be.reverted;
  });

  it('can only grant vault controller role if sender is admin', async () => {
    const role = await vestingVault.VAULT_CONTROLLER_ROLE();

    // Admin granting vault controller role to themself
    expect(await vestingVault.grantRole(role, adminUser.address))
      .to.emit(vestingVault, 'RoleGranted')
      .withArgs(role, adminUser.address, adminUser.address);

    expect(await vestingVault.hasRole(role, adminUser.address)).to.be.true;
  });

  it('can add a new beneficiary to the vesting vault', async () => {
    expect(await vestingVault.addBeneficiary(userOne.address, releaseTime, tokenAmount))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(userOne.address, releaseTime, tokenAmount);

    // We transfer tokenAmount to vesting vault so the vault has tokenAmount to release
    await token.connect(wallet).transfer(vestingVault.address, tokenAmount);

    const vestings = (await vestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));

    expect(totalTokenAmount).to.be.equal(tokenAmount);
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(tokenAmount);
  });

  it('can increase the tokens of an existing beneficiary for an existing release time', async () => {
    expect(await vestingVault.addBeneficiary(userOne.address, releaseTime, increaseTokensBy))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(userOne.address, releaseTime, increaseTokensBy);

    await token.connect(wallet).transfer(vestingVault.address, increaseTokensBy);

    const vestings = (await vestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));

    expect(totalTokenAmount).to.be.equal(newTokenAmount);

    expect(await token.balanceOf(vestingVault.address)).to.be.equal(newTokenAmount);
  });

  it('can add another vesting to an existing beneficiary for a different release time', async () => {
    expect(vestingVault.addBeneficiary(userOne.address, releaseTime + 1, tokenAmount))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(userOne.address, releaseTime + 1, tokenAmount);

    newTokenAmount = newTokenAmount + tokenAmount;

    await token.connect(wallet).transfer(vestingVault.address, tokenAmount);
  });

  it('can return the vesting of a beneficiary', async () => {
    const vestings = (await vestingVault.vestingFor(userOne.address)) as unknown as Vesting[];
    expect(vestings[0].beneficiary).to.be.equal(userOne.address);
  });

  it('can release the vesting tokens of a beneficiary', async () => {
    // Set current time to be after releaseTime
    const nextTimestamp = 5 * 365 * 24 * 60 * 60;
    await network.provider.send('evm_increaseTime', [nextTimestamp]);

    // Release tokens of userOne
    const userOneVestingVault = vestingVault.connect(userOne);
    expect(await userOneVestingVault.release()).to.emit(userOneVestingVault, 'VestingReleased');

    // Balance of tokens of userOne increases
    expect(await token.balanceOf(userOne.address)).to.equal(newTokenAmount);

    // Balance of vesting vault decreases
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(0);
  });

  it('fails to release tokens when beneficiary has less than 1 token', async () => {
    // Set current time to be after releaseTime
    const nextTimestamp = 5 * 365 * 24 * 60 * 60;
    await network.provider.send('evm_increaseTime', [nextTimestamp]);

    // Release tokens of adminUser
    // Since adminUser was not added as a beneficiary, their tokens will be 0 by default
    expect(vestingVault.release()).to.be.revertedWith('VestingVault: Cannot release 0 tokens');
  });

  it('fails to release tokens before release time', async () => {
    const veryLargeReleaseTime = 3114690041;

    // Add userTwo as a beneficiary in the VestingVault
    expect(await vestingVault.addBeneficiary(userTwo.address, veryLargeReleaseTime, tokenAmount))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(userTwo.address, veryLargeReleaseTime, tokenAmount);

    // Transfer `tokenAmount` to vesting vault
    await token.connect(wallet).transfer(vestingVault.address, tokenAmount);

    // Attempt to release tokens of userTwo
    expect(vestingVault.connect(userTwo).release()).to.be.revertedWith('VestingVault: Cannot release 0 tokens');
  });

  it('when there are multiple release times, it releases tokens only for which release time is enabled', async () => {
    // Vesting vault has tokenAmount number of tokens
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(tokenAmount);

    // Add another entry for userTwo beneficiary in the VestingVault
    expect(await vestingVault.addBeneficiary(userTwo.address, releaseTime, tokenAmount))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(userTwo.address, releaseTime, tokenAmount);

    await token.connect(wallet).transfer(vestingVault.address, tokenAmount);

    // Set current time to be after releaseTime
    const nextTimestamp = 5 * 365 * 24 * 60 * 60;
    await network.provider.send('evm_increaseTime', [nextTimestamp]);

    // Release tokens of userTwo
    // Only token added in this test case should be released
    const userTwoVestingVault = vestingVault.connect(userTwo);
    expect(await userTwoVestingVault.release()).to.emit(userTwoVestingVault, 'VestingReleased');

    // userTwo has tokenAmount number of tokens
    expect(await token.balanceOf(userTwo.address)).to.be.equal(tokenAmount);

    // Vesting vault has tokenAmount number of tokens left
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(tokenAmount);

    // userTwo still has tokenAmount number of tokens still in the vesting vault
    const vestings = (await vestingVault.vestingFor(userTwo.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));

    expect(totalTokenAmount).to.be.equal(tokenAmount);
  });

  it('user can not release tokens not belonging to him', async () => {
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(tokenAmount);

    // Say vesting vault gets another 20 tokens which have come from adding different beneficiaries
    await token.connect(wallet).transfer(vestingVault.address, 20);

    // Add adminUser as a beneficiary in the VestingVault
    expect(await vestingVault.addBeneficiary(adminUser.address, releaseTime, tokenAmount))
      .to.emit(vestingVault, 'VestingLockedIn')
      .withArgs(adminUser.address, releaseTime, tokenAmount);

    // Transfer tokenAmount to vesting vault
    await token.connect(wallet).transfer(vestingVault.address, tokenAmount);

    // Admin user has tokenAmount stored in the VestingVault
    const vestings = (await vestingVault.vestingFor(adminUser.address)) as unknown as Vesting[];
    let totalTokenAmount: BigNumber = BigNumber.from(0);
    vestings.map((vest) => (totalTokenAmount = totalTokenAmount.add(vest.tokenAmount)));
    expect(totalTokenAmount).to.be.equal(tokenAmount);

    // Admin user has 0 tokens
    expect(await token.balanceOf(adminUser.address)).to.be.equal(0);

    // Vesting vault has 20 (ref. line 160) + 1 (userTwo's token) + 1 (adminUser's token) tokens
    expect(await token.balanceOf(vestingVault.address)).to.be.equal(22);

    // Set current time to be after releaseTime
    const nextTimestamp = 5 * 365 * 24 * 60 * 60;
    await network.provider.send('evm_increaseTime', [nextTimestamp]);

    // Release tokens of adminUser
    expect(await vestingVault.release()).to.emit(vestingVault, 'VestingReleased');

    // Balance of tokens of adminUser increases
    expect(await token.balanceOf(adminUser.address)).to.equal(tokenAmount);

    // Balance of vestingVault goes back to 21
    expect(await token.balanceOf(vestingVault.address)).to.equal(21);

    // At this point, adminUser has released all tokens allocated to them

    // Set current time to be after releaseTime
    await network.provider.send('evm_increaseTime', [nextTimestamp]);

    // Attempt to release tokens of not belonging to adminUser, but present in the vesting vault
    expect(vestingVault.release()).to.be.revertedWith('VestingVault: Cannot release 0 tokens');

    // Balance of tokens of adminUser doesn't increase, meaning they can't release tokens not belonging to them
    expect(await token.balanceOf(adminUser.address)).to.equal(tokenAmount);
  });

  it('supports ERC165 interface', async () => {
    const ERC165InterfaceId = '0x01ffc9a7';
    expect(await vestingVault.supportsInterface(ERC165InterfaceId)).to.be.true;
  });
});
