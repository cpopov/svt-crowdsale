import { Address, Bytes, ipfs, json, JSONValueKind } from '@graphprotocol/graph-ts';
import { IERC721 } from '@openzeppelin/subgraphs/generated/erc721/IERC721';
import { ERC721Contract } from '@openzeppelin/subgraphs/generated/schema';
import { ERC721Token, ERC721TokenAttribute, ERC721TokenMetadata } from '../../generated/schema';

export function fetchERC721TokenIpfsMetadata(
  contractId: string,
  tokenId: string,
  refresh: boolean
): ERC721TokenMetadata {
  let metadata = ERC721TokenMetadata.load(tokenId);
  const contract = ERC721Contract.load(Bytes.fromHexString(contractId));
  const token = ERC721Token.load(tokenId);

  if ((metadata == null || refresh) && contract !== null && contract.supportsMetadata && token != null) {
    metadata = new ERC721TokenMetadata(tokenId);
    token.metadata = metadata.id;
    const erc721 = IERC721.bind(Address.fromString(contract.id.toHex()));
    const try_tokenURI = erc721.try_tokenURI(token.identifier);
    const uri = try_tokenURI.reverted ? '' : try_tokenURI.value;

    if (uri.includes('ipfs://')) {
      const ipfsHash = uri.replace('ipfs://', '');
      const tokenURIBytes = ipfs.cat(ipfsHash);
      if (tokenURIBytes) {
        const tokenURIContent = json.try_fromBytes(tokenURIBytes);
        if (tokenURIContent.isOk && tokenURIContent.value.kind == JSONValueKind.OBJECT) {
          const tokenMetadata = tokenURIContent.value.toObject();

          const name = tokenMetadata.get('name');
          metadata.name = name ? name.toString() : null;

          const description = tokenMetadata.get('description');
          metadata.description = description ? description.toString() : null;

          const image = tokenMetadata.get('image');
          metadata.image = image ? image.toString() : null;

          const attributes = tokenMetadata.get('attributes');
          if (attributes && attributes.kind == JSONValueKind.ARRAY) {
            const attributesArray = attributes.toArray();
            for (let i = 0; i < attributesArray.length; i++) {
              const attributeId = metadata.id.concat('/').concat(i.toString());
              let attribute = ERC721TokenAttribute.load(attributeId);
              if (attribute == null && attributesArray[i].kind == JSONValueKind.OBJECT) {
                const attributeData = attributesArray[i].toObject();
                attribute = new ERC721TokenAttribute(attributeId);
                attribute.metadata = metadata.id;

                const traitType = attributeData.get('trait_type');
                attribute.traitType = traitType ? traitType.toString() : '';

                const value = attributeData.get('value');
                if (value && value.kind == JSONValueKind.STRING) {
                  attribute.value = value ? value.toString() : '';
                } else if (value && value.kind == JSONValueKind.NUMBER) {
                  attribute.value = value ? value.toBigInt().toString() : '';
                }

                const maxValue = attributeData.get('max_value');
                attribute.maxValue = maxValue ? maxValue.toBigInt() : null;

                const displayType = attributeData.get('display_type');
                attribute.displayType = displayType ? displayType.toString() : null;

                attribute.save();
              }
            }
          }
        }
      }
    }
    metadata.save();
    token.save();
  }
  return metadata as ERC721TokenMetadata;
}
