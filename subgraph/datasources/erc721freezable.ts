import { fetchERC721, fetchERC721Token } from '@openzeppelin/subgraphs/src/fetch/erc721';
import { PermanentURI as PermanentURIEvent } from '../../generated/erc721freezable/ERC721Freezable';
import { fetchERC721TokenIpfsMetadata } from '../fetch/erc721ipfs';

export function handlePermanentURI(event: PermanentURIEvent): void {
  const contract = fetchERC721(event.address);
  if (contract != null) {
    const token = fetchERC721Token(contract, event.params._id);
    if (token != null) {
      fetchERC721TokenIpfsMetadata(contract.id.toHex(), token.id, true);
    }
  }
}
