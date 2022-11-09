import { ContractTransaction } from 'ethers';

export async function ethersLog(contractTransaction: Promise<ContractTransaction>, message: string) {
  const tx = await contractTransaction;
  process.stdout.write(`${message} (tx: ${tx.hash})...`);
  try {
    const txr = await tx.wait();
    process.stdout.write(`: SUCCESS with ${txr.cumulativeGasUsed.toString()} gas\n`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    process.stdout.write(`: FAILED with ${err.data?.message ?? err.message}\n`);
  }
}
