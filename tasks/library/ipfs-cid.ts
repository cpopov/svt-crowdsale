import { task } from 'hardhat/config';
import { create } from 'ipfs-http-client';
import { ipfsNodes } from '../../.secrets/default.hardhat.config';

task('ipfs-cid', 'Gets a CID on IPFS for a path')
  .addParam<string>('ipfspath', 'the path')
  .addParam<string>('ipfsnode', 'the key of the ipfs node to use')
  .setAction(async ({ ipfspath, ipfsnode }: { ipfspath: string; ipfsnode: string }) => {
    const ipfsClient = create({
      url: ipfsNodes[ipfsnode].url,
      headers: ipfsNodes[ipfsnode].headers,
    });
    const { cid } = await ipfsClient.files.stat(ipfspath);
    return cid.toString();
  });
