// SPDX-License-Identifier: MIT
// SettleMint.com

pragma solidity ^0.8.9;

import {VestingVault} from "./library/finance/vesting/VestingVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ExampleVestingVault is VestingVault {
  constructor(IERC20 token_) VestingVault(token_) {}
}
