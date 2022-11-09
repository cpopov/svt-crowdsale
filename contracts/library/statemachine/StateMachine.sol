// SPDX-License-Identifier: MIT
// SettleMint.com

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

/**
 * @title Base contract for state machines
 */
abstract contract StateMachine is ERC165, AccessControl {
  event Transition(address sender, bytes32 fromState, bytes32 toState);

  struct State {
    // a boolean to check if the state is actually created
    bool hasBeenCreated;
    // a mapping of functions that can be executed when in this state
    mapping(bytes4 => bool) allowedFunctions;
    // a mapping of alls roles that have been configured for this state
    mapping(bytes32 => bool) allAllowedRoles;
    // a list of all the roles that have been configured for this state
    bytes32[] allowedRoles;
    // a list of all the preconditions that have been configured for this state
    function(bytes32, bytes32) internal view[] preConditions;
    // a list of callbacks to execute before the state transition completes
    function(bytes32, bytes32) internal[] callbacks;
    // a list of states that can be transitioned to
    bytes32[] nextStates;
    // function that executes logic and then does a StateTransition
    bytes4 preFunction;
  }

  struct StateTransition {
    bytes32 fromState;
    bytes32 toState;
    address actor;
    uint256 timestamp;
  }

  StateTransition[] public history;

  mapping(bytes32 => State) internal states;
  bytes32[] internal possibleStates;
  bytes32 internal currentState;

  // a list of selectors that might be allowed functions
  bytes4[] internal knownSelectors;
  mapping(bytes4 => bool) internal knownSelector;

  // a mapping of allowed functions per state
  mapping(bytes32 => bytes4[]) internal stateFunction;

  // To Check if there is a relation between one state and another
  mapping(bytes32 => mapping(bytes32 => bool)) internal nextStateToState;

  // Id of the entity that is traversing the different states
  // uint256 format because sha3 or UUID are 64 bytes
  uint256 internal _entityId;

  // baseURI fixed prefix of a entityURI
  string internal _baseURI = "";

  /**
   * @notice Modifier to ensure only Admin can call specific functions
   */
  modifier hasAdminRole(address caller) {
    require(hasRole(DEFAULT_ADMIN_ROLE, caller), "Caller is not an admin");
    _;
  }

  /**
   * @dev Returns whether `entityId` exists.
   **/
  function _exists(uint256 entityId) internal view virtual returns (bool) {
    return _entityId != 0 && entityId == _entityId;
  }

  /**
   * @notice Modifier to ensure the statemachine was setup
   */
  modifier checkStateMachineSetup() {
    require(possibleStates.length > 0, "this statemachine has not been setup yet");
    _;
  }

  /**
   * @notice Modifier to secure functions for a specific state
   */
  modifier checkAllowedFunction() {
    require(states[currentState].allowedFunctions[msg.sig], "this function is not allowed in this state");
    _;
  }

  /**
   * @notice Modifier that checks if we can trigger a transition between the current state and the next state
   */
  modifier checkTransitionCriteria(bytes32 toState, bytes32 role) {
    checkAllTransitionCriteria(getCurrentState(), toState, role);
    _;
  }

  /**
   * @notice Modifier that checks if a state already exists or not
   */
  modifier doesStateExist(bytes32 state) {
    require(states[state].hasBeenCreated, "the state has not been created yet");
    _;
  }

  function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, AccessControl) returns (bool) {
    return interfaceId == type(StateMachine).interfaceId || super.supportsInterface(interfaceId); // ERC165, AccessControl
  }

  /**
   * @notice Returns the length of the history
   */
  function getHistoryLength() public view returns (uint256) {
    return history.length;
  }

  /**
   * @notice Returns history as tuple for given index.
   * @dev Requires the index to be within the bounds of the history array
   */
  function getHistory(uint256 index)
    public
    view
    returns (
      bytes32 fromState,
      bytes32 toState,
      address actor,
      uint256 timestamp
    )
  {
    require(index >= 0 && index < history.length, "Index out of bounds");
    return (history[index].fromState, history[index].toState, history[index].actor, history[index].timestamp);
  }

  /**
   * @notice Returns the name of the current state of this object.
   * @dev Requires the current state to be configured before calling this function
   */
  function getCurrentState() public view returns (bytes32 state) {
    require(states[currentState].hasBeenCreated, "the initial state has not been created yet");
    return currentState;
  }

  /**
   * @notice Returns a list of all the possible states of this object.
   */
  function getAllStates() public view returns (bytes32[] memory allStates) {
    return possibleStates;
  }

  /**
   * @notice Returns a list of all the possible next states of the current state.
   */
  function getNextStates() public view returns (bytes32[] memory nextStates) {
    return states[currentState].nextStates;
  }

  /**
   * @notice Returns state as tuple for give state.
   */
  function getState(bytes32 state)
    public
    view
    returns (
      bytes32 name,
      bytes32[] memory nextStates,
      bytes32[] memory allowedRoles,
      bytes4[] memory allowedFunctions,
      bytes4 preFunction
    )
  {
    State storage s = states[state];

    return (state, s.nextStates, s.allowedRoles, stateFunction[state], s.preFunction);
  }

  /**
   * @notice Transitions the state and executes all callbacks.
   * @dev Emits a Transition event after a successful transition.
   */
  function transitionState(bytes32 toState, bytes32 role)
    public
    checkStateMachineSetup
    checkTransitionCriteria(toState, role)
  {
    bytes32 oldState = currentState;
    currentState = toState;

    function(bytes32, bytes32) internal[] storage callbacks = states[oldState].callbacks;
    for (uint256 i = 0; i < callbacks.length; i++) {
      callbacks[i](oldState, toState);
    }

    history.push(
      StateTransition({fromState: oldState, toState: toState, actor: msg.sender, timestamp: block.timestamp})
    );

    emit Transition(msg.sender, oldState, currentState);
  }

  /**
   * @dev Abstract function to setup the state machine configuration
   */
  function setupStateMachine(address admin) internal virtual {}

  function createState(bytes32 stateName) internal {
    require(!states[stateName].hasBeenCreated, "this state has already been created");
    states[stateName].hasBeenCreated = true;
    possibleStates.push(stateName);
  }

  /**
   * @notice Updates expense properties
   * @param roleName Bytes32 name of the role to be granted
   * @param account Grant a role to a specific account
   */
  function grantRoleToAccount(bytes32 roleName, address account) public hasAdminRole(msg.sender) {
    _grantRole(roleName, account);
  }

  /**
   * @notice Add a role at a specific state on a specific account
   * @param state Bytes32 state name
   * @param role Role related to that state
   * @param account Account to add the role for
   */
  function addRoleForState(
    bytes32 state,
    bytes32 role,
    address account
  ) public doesStateExist(state) hasAdminRole(msg.sender) {
    require(!states[state].allAllowedRoles[role], "the role has been already added at this state");
    states[state].allAllowedRoles[role] = true;
    states[state].allowedRoles.push(role);
    _grantRole(role, account);
  }

  /**
   * @notice Define specific functions for a state
   * @param state Bytes32 state name
   * @param allowedFunction Set of functions for that state
   */
  function addAllowedFunctionForState(bytes32 state, bytes4 allowedFunction)
    public
    doesStateExist(state)
    hasAdminRole(msg.sender)
  {
    if (!knownSelector[allowedFunction]) {
      knownSelector[allowedFunction] = true;
      knownSelectors.push(allowedFunction);
    }
    states[state].allowedFunctions[allowedFunction] = true;
    stateFunction[state].push(allowedFunction);
  }

  /**
   * @notice Define next state for state
   * @param state Bytes32 state name
   * @param nextState Next state to transit to
   */
  function addNextStateForState(bytes32 state, bytes32 nextState)
    public
    doesStateExist(state)
    doesStateExist(nextState)
    hasAdminRole(msg.sender)
  {
    states[state].nextStates.push(nextState);
    nextStateToState[state][nextState] = true;
  }

  function addCallbackForState(bytes32 state, function(bytes32, bytes32) internal callback)
    internal
    doesStateExist(state)
  {
    states[state].callbacks.push(callback);
  }

  function addPreConditionForState(bytes32 state, function(bytes32, bytes32) internal view preCondition)
    internal
    doesStateExist(state)
  {
    states[state].preConditions.push(preCondition);
  }

  function setPreFunctionForState(bytes32 state, bytes4 functionSig) internal doesStateExist(state) {
    states[state].preFunction = functionSig;
  }

  /**
   * @notice Configures the initial state of an object
   */
  function setInitialState(bytes32 initialState) internal {
    require(states[initialState].hasBeenCreated, "the initial state has not been created yet");
    require(currentState == 0, "Current state has already been set, you cannot reset it");
    currentState = initialState;
    emit Transition(msg.sender, 0x00, currentState);
  }

  /**
   * @notice Function that checks if we can trigger a transition between two states
   * @dev This checks if the states exist, if the user has a role to go to the chosen next state and
   * @dev and if all the preconditions give the ok.
   */
  function checkAllTransitionCriteria(
    bytes32 fromState,
    bytes32 toState,
    bytes32 role
  ) private view {
    require(states[fromState].hasBeenCreated, "the from state has not been configured in this object");
    require(states[toState].hasBeenCreated, "the to state has not been configured in this object");
    require(checkNextStates(fromState, toState), "This transition is not allowed");
    require(checkAllowedRoles(role), "the sender of this transaction cannot perform this transition");
    checkPreConditions(fromState, toState);
  }

  /**
   * @notice Checks if it is allowed to transition between the given states
   */
  function checkNextStates(bytes32 fromState, bytes32 toState) private view returns (bool hasNextState) {
    hasNextState = false;
    if (nextStateToState[fromState][toState]) {
      hasNextState = true;
    }
    return hasNextState;
  }

  /**
   * @notice Checks all the custom preconditions that determine if it is allowed to transition to a next state
   * @dev Make sure the preconditions require or assert their checks and have an understandable error message
   */
  function checkPreConditions(bytes32 fromState, bytes32 toState) private view {
    function(bytes32, bytes32) internal view[] storage preConditions = states[toState].preConditions;
    for (uint256 i = 0; i < preConditions.length; i++) {
      preConditions[i](fromState, toState);
    }
  }

  /**
   * @notice Checks if the sender has a role that is allowed to transition to a next state
   */
  function checkAllowedRoles(bytes32 role) public view returns (bool) {
    return hasRole(role, msg.sender);
  }
}
