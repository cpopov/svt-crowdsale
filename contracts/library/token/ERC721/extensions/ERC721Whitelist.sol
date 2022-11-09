/**
 * Copyright (C) SettleMint NV - All Rights Reserved
 *
 * Use of this file is strictly prohibited without an active subscription.
 * Distribution of this file, via any medium, is strictly prohibited.
 *
 * For license inquiries, contact hello@settlemint.com
 *
 * SPDX-License-Identifier: UNLICENSED
 */

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

abstract contract ERC721Whitelist is Context {
  bytes32 public _whitelistMerkleRoot;

  function _setWhitelistMerkleRoot(bytes32 whitelistMerkleRoot_) internal {
    _whitelistMerkleRoot = whitelistMerkleRoot_;
  }

  function _leaf(string memory allowance, string memory payload) internal pure returns (bytes32) {
    return keccak256(abi.encodePacked(payload, allowance));
  }

  function _verify(bytes32 leaf, bytes32[] memory proof) internal view returns (bool) {
    require(_whitelistMerkleRoot != 0, "Whitelist merkle root not set");
    return MerkleProof.verify(proof, _whitelistMerkleRoot, leaf);
  }

  function getAllowance(string memory allowance, bytes32[] calldata proof) public view returns (string memory) {
    string memory payload = string(abi.encodePacked(_msgSender()));
    require(_verify(_leaf(allowance, payload), proof), "Invalid Merkle Tree proof supplied.");
    return allowance;
  }

  function _validateWhitelistMerkleProof(uint256 allowance, bytes32[] calldata proof) internal view returns (bool) {
    string memory payload = string(abi.encodePacked(_msgSender()));
    return _verify(_leaf(Strings.toString(allowance), payload), proof);
  }

  function _disableWhitelistMerkleRoot() internal {
    delete _whitelistMerkleRoot;
  }
}
