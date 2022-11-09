// SPDX-License-Identifier: MIT
// SettleMint.com

pragma solidity ^0.8.9;

import "../StateMachine.sol";

abstract contract StateMachineMetadata is StateMachine {
  // mapping for entityURIs
  mapping(uint256 => string) private _entityURIs;

  /**
   * @dev get the attwched entityURI from an existing entityId
   */
  function entityURI(uint256 entityId) public view virtual returns (string memory) {
    require(_exists(entityId), "StateMachineMetadata: URI query for nonexistent entity");
    string memory _entityURI = _entityURIs[entityId];

    // If the baseURI is empty, just return the unprefixed URI
    if (bytes(_baseURI).length == 0) {
      return _entityURI;
    }

    return string(abi.encodePacked(_baseURI, _entityURI));
  }

  /**
   * @dev Sets `_entityURI` as the entityURI of `entityId`.
   *
   * Requirements:
   *
   * - `entityId` must exist.
   */
  function _setEntityURI(uint256 entityId, string memory _entityURI) internal virtual {
    require(_exists(entityId), "StateMachineMetaData: URI set of nonexistent ");
    _entityURIs[entityId] = _entityURI;
  }
}
