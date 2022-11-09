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

abstract contract ERC721OpenSeaGassLess is ERC721 {
  address public _proxyRegistryAddress;

  constructor(address proxyRegistryAddress_) {
    _proxyRegistryAddress = proxyRegistryAddress_;
  }

  function _setProxyRegistryAddress(address proxyRegistryAddress_) internal virtual {
    _proxyRegistryAddress = proxyRegistryAddress_;
  }

  function isApprovedForAll(address _owner, address operator) public view virtual override returns (bool) {
    if (_proxyRegistryAddress != address(0)) {
      OpenSeaProxyRegistry proxyRegistry = OpenSeaProxyRegistry(_proxyRegistryAddress);
      if (address(proxyRegistry.proxies(_owner)) == operator) {
        return true;
      }
    }
    return super.isApprovedForAll(_owner, operator);
  }
}

contract OwnableDelegateProxy {}

contract OpenSeaProxyRegistry {
  mapping(address => OwnableDelegateProxy) public proxies;
}
