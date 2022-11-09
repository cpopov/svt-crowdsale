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

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract ERC721Batch is ERC721 {
  function batchTransferFrom(
    address _from,
    address _to,
    uint256[] memory _tokenIds
  ) public {
    for (uint256 i = 0; i < _tokenIds.length; i++) {
      transferFrom(_from, _to, _tokenIds[i]);
    }
  }

  function batchSafeTransferFrom(
    address _from,
    address _to,
    uint256[] memory _tokenIds,
    bytes memory data_
  ) public {
    for (uint256 i = 0; i < _tokenIds.length; i++) {
      safeTransferFrom(_from, _to, _tokenIds[i], data_);
    }
  }
}
