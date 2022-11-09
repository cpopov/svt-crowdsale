import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import chai, { expect } from 'chai';
import { solidity } from 'ethereum-waffle';
import { BigNumber } from 'ethers';
import { ethers, waffle } from 'hardhat';
import ExampleTokenArtifact from '../artifacts/contracts/ExampleToken.sol/ExampleToken.json';
import { ExampleToken } from '../typechain-types/contracts/ExampleToken';

const { deployContract } = waffle;
chai.use(solidity);

describe('ExampleToken', function () {
  let exampleToken: ExampleToken;
  const initialSupply: BigNumber = BigNumber.from('3765000000').mul(BigNumber.from('10').pow(18));
  let adminUser: SignerWithAddress;
  let userOne: SignerWithAddress;
  let userTwo: SignerWithAddress;
  let wallet: SignerWithAddress;
  const zeroAddress = '0x0000000000000000000000000000000000000000';

  beforeEach(async function () {
    [adminUser, wallet, userOne, userTwo] = await ethers.getSigners();
    exampleToken = (await deployContract(adminUser, ExampleTokenArtifact, [
      'ExampleToken',
      'ET',
      initialSupply,
      wallet.address,
    ])) as ExampleToken;
  });

  it('has a name', async () => {
    expect(await exampleToken.name()).to.equal('ExampleToken');
  });

  it('has a symbol', async () => {
    expect(await exampleToken.symbol()).to.equal('ET');
  });

  it('has 18 decimals', async () => {
    expect(await exampleToken.decimals()).to.equal(18);
  });

  it('returns the total amount of tokens', async () => {
    expect(await exampleToken.totalSupply()).to.equal(initialSupply);
  });

  it('when the requested account has no tokens, it returns zero', async () => {
    expect(await exampleToken.balanceOf(userOne.address)).to.equal(0);
  });

  it('when the requested account has some tokens, returns the total amount of tokens', async () => {
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(initialSupply);
  });

  it('when the sender does not have enough balance, it reverts', async () => {
    await expect(exampleToken.transfer(userOne.address, initialSupply.add(1))).to.be.revertedWith(
      'transfer amount exceeds balance'
    );
  });

  it('transfers the requested amount', async () => {
    // wallet transfers initialSupply amount of tokens to userOne
    const walletToken = exampleToken.connect(wallet);
    await walletToken.transfer(userOne.address, initialSupply);
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(0);
    expect(await exampleToken.balanceOf(userOne.address)).to.equal(initialSupply);
  });

  it('emits a transfer event', async () => {
    const walletToken = exampleToken.connect(wallet);
    await expect(walletToken.transfer(userOne.address, initialSupply))
      .to.emit(exampleToken, 'Transfer')
      .withArgs(wallet.address, userOne.address, initialSupply);
  });

  it('when the recipient is the zero address, it reverts', async () => {
    await expect(exampleToken.transfer(zeroAddress, initialSupply)).to.be.revertedWith('transfer to the zero address');
  });

  it('when the spender has enough approved balance, transfers the requested amount', async () => {
    // wallet is the owner
    // wallet approves userOne to spend initialSupply amount of tokens
    const walletToken = exampleToken.connect(wallet);
    await expect(walletToken.approve(userOne.address, initialSupply))
      .to.emit(exampleToken, 'Approval')
      .withArgs(wallet.address, userOne.address, initialSupply);

    // userOne transfers initialSupply amount of tokens to userTwo as wallet
    const userOneToken = exampleToken.connect(userOne);
    await expect(userOneToken.connect(userOne).transferFrom(wallet.address, userTwo.address, initialSupply))
      .to.emit(exampleToken, 'Transfer')
      .withArgs(wallet.address, userTwo.address, initialSupply);
    expect(await exampleToken.balanceOf(wallet.address)).to.equal(0);
    expect(await exampleToken.balanceOf(userTwo.address)).to.equal(initialSupply);
    expect(await exampleToken.allowance(wallet.address, userOne.address)).to.equal(0);
  });

  it('when the token owner does not have enough balance, it reverts', async () => {
    // adminUser has 0 tokens
    expect(await exampleToken.balanceOf(adminUser.address)).to.be.equal(0);

    // adminUser approves userOne to spend initialSupply+1 amount of tokens on their behalf
    await expect(exampleToken.approve(userOne.address, initialSupply.add(1)))
      .to.emit(exampleToken, 'Approval')
      .withArgs(adminUser.address, userOne.address, initialSupply.add(1));

    // userOne tries to transfer initialSupply+1 amount of tokens to userTwo as adminUser
    // Since adminUser does not have enough tokens, the transaction is reverted
    await expect(
      exampleToken.connect(userOne).transferFrom(adminUser.address, userTwo.address, initialSupply.add(1))
    ).to.be.revertedWith('transfer amount exceeds balance');
  });

  it('when the spender does not have enough approved balance, it reverts', async () => {
    // wallet approves userOne to spend initialSupply-1 amount of tokens on their behalf
    await expect(exampleToken.connect(wallet).approve(userOne.address, initialSupply.sub(1)))
      .to.emit(exampleToken, 'Approval')
      .withArgs(wallet.address, userOne.address, initialSupply.sub(1));

    // userOne tries to transfer initialSupply amount of tokens to userTwo as wallet
    // Since userOne is not approved to to spend that initialSupply amount of tokens to userTwo as wallet
    // the transaction reverts
    await expect(
      exampleToken.connect(userOne).transferFrom(wallet.address, userTwo.address, initialSupply)
    ).to.be.revertedWith('ERC20: insufficient allowance');
  });

  it('when the recipient of transferFrom is the zero address, it reverts', async () => {
    await expect(exampleToken.approve(userOne.address, initialSupply.add(1)))
      .to.emit(exampleToken, 'Approval')
      .withArgs(adminUser.address, userOne.address, initialSupply.add(1));
    await expect(
      exampleToken.connect(userOne).transferFrom(adminUser.address, zeroAddress, initialSupply.add(1))
    ).to.be.revertedWith('transfer to the zero address');
  });

  it('supports ERC165 interface', async () => {
    const ERC165InterfaceId = '0x01ffc9a7';
    expect(await exampleToken.supportsInterface(ERC165InterfaceId)).to.be.true;
  });
});
