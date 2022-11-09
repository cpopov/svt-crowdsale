import { Address, BigInt, ipfs, json, JSONValueKind } from '@graphprotocol/graph-ts';
import { Account, StateMachineMetadataContract } from '../../generated/schema';
import { StateMachineMetadata } from '../../generated/statemachinemetadata/StateMachineMetadata';

export function fetchStateMachine(address: Address): StateMachineMetadataContract {
  const account = new Account(address);
  account.save();

  let contract = StateMachineMetadataContract.load(account.id.toHex());

  if (contract == null) {
    contract = new StateMachineMetadataContract(account.id.toHex());
  }

  const sm = StateMachineMetadata.bind(address);
  // This value is created in the deploy file and needs to match the value passed here
  const try_entityURI = sm.try_entityURI(BigInt.fromString(`3073193977`));
  const metadataURI = try_entityURI.reverted ? '' : try_entityURI.value;

  if (metadataURI.includes('ipfs://')) {
    const ipfsHash = metadataURI.replace('ipfs://', '');
    const metadataURIBytes = ipfs.cat(ipfsHash);
    if (metadataURIBytes) {
      const metadataURIContent = json.try_fromBytes(metadataURIBytes);
      if (metadataURIContent.isOk && metadataURIContent.value.kind == JSONValueKind.OBJECT) {
        const entityMetadata = metadataURIContent.value.toObject();

        const param1 = entityMetadata.get('param1');
        const param2 = entityMetadata.get('param2');

        contract.param1 = param1 ? param1.toString() : null;
        contract.param2 = param2 ? param2.toString() : null;

        contract.save();
      }
    }
  }

  contract.save();
  return contract;
}
