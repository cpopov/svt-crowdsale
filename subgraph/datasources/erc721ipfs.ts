import { Transfer as TransferEvent } from '@openzeppelin/subgraphs/generated/erc721/IERC721';
import { fetchERC721, fetchERC721Token } from '@openzeppelin/subgraphs/src/fetch/erc721';
import { fetchERC721TokenIpfsMetadata } from '../fetch/erc721ipfs';

export function handleTransfer(event: TransferEvent): void {
  const contract = fetchERC721(event.address);
  if (contract != null) {
    const token = fetchERC721Token(contract, event.params.tokenId);
    if (token != null) {
      fetchERC721TokenIpfsMetadata(contract.id.toHex(), token.id, false);
    }
  }
}
