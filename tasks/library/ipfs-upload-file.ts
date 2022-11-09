import {readFileSync} from 'fs';
import {task} from 'hardhat/config';
import {create} from 'ipfs-http-client';
import {Blob, NFTStorage} from 'nft.storage';
import {ipfsNodes} from '../../.secrets/default.hardhat.config';
import {nftStorageToken} from '../../hardhat.config';

async function pinToNFTStorage(blob: Blob) {
  if (!nftStorageToken || nftStorageToken === '') {
    return;
  }
  const pinning = new NFTStorage({
    endpoint: new URL('https://api.nft.storage'),
    token: nftStorageToken,
  });
  return pinning.storeBlob(blob);
}

async function ipfsUpload(ipfsnode: string, filePath: string, content: Buffer | Record<string, any>, pin?: true) {
  if (Object.keys(ipfsNodes).length === 0 || !Object.keys(ipfsNodes).includes(ipfsnode)) {
    throw new Error(
      `No IPFS node found or configured wrong (${ipfsnode} not found in ${Object.keys(ipfsNodes).join(', ')})`
    );
  }
  const ipfsClient = create({
    url: ipfsNodes[ipfsnode].url,
    headers: ipfsNodes[ipfsnode].headers,
  });
  const contentToStore = Buffer.isBuffer(content) ? content : Buffer.from(JSON.stringify(content, null, 2));
  await ipfsClient.files.write(filePath, contentToStore, {
    create: true,
    parents: true,
    cidVersion: 1,
    hashAlg: 'sha2-256',
  });
  if (pin) {
    await pinToNFTStorage(new Blob([contentToStore]));
  }
  const { cid } = await ipfsClient.files.stat(filePath);
  console.log(`       Uploaded ${filePath} to IPFS (${cid})`);
  return cid;
}

task('ipfs-upload-file', 'Uploads a file to IPFS')
  .addParam<string>('sourcepath', 'the path to the file on your filesystem')
  .addParam<string>('ipfspath', 'the path where you want to store the file on your ipfs node')
  .addParam<string>('ipfsnode', 'the key of the ipfs node to use')
  .setAction(async ({ sourcepath, ipfspath, ipfsnode }: { sourcepath: string; ipfspath: string; ipfsnode: string }) => {
    const fileContents = readFileSync(sourcepath);
    return (await ipfsUpload(ipfsnode, ipfspath, fileContents)).toString();
  });

task('ipfs-upload-string', 'Uploads a file to IPFS')
  .addParam<string>('data', 'the path to the file on your filesystem')
  .addParam<string>('ipfspath', 'the path where you want to store the file on your ipfs node')
  .addParam<string>('ipfsnode', 'the key of the ipfs node to use')
  .setAction(async ({ data, ipfspath, ipfsnode }: { data: string; ipfspath: string; ipfsnode: string }) => {
    return (await ipfsUpload(ipfsnode, ipfspath, Buffer.from(data, 'utf8'))).toString();
  });
