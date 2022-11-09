# ERC20 Crowd Sale

This smart contract set implements an extensive crowdsale setup for an ERC20 token.

In this usecase we implement the following:

- A crowdsale in several phases, each with different parameters and the flexibiltiy to add more
- Optional vesting periods for each phase
- A vested project fund
- Crowdsale denomination in USD levraging Chainlink
- Built in Polygon bridging capabilities (issue on Polygon, bridge to Ethereum)
- KYC/AML whitelisting

## General structure of our indexing modules

The Graph middleware listens to certain events emitted by certain smart contracts on the blockchain. When it detects those events, it performs some user-defined processing on the data emitted by those events and finally stores the processed data. This stored data is then queried by user facing apps.

It leverages indexing modules to do the same.

The indexing modules have 3 main components:

1. The Schema
2. The Subgraph Manifest
3. The Mappings

With SettleMint's indexing modules, you don't need to configure every any detail of this elaborate setup. We offer a set of robust, flexible indexing modules for you to use out-of-the-box so you can focus on your business logic instead of worrying about orchestration.

### 1. The Schema

The schema of the indexing module describes how we store the data. For an indexing module named `x`, it is located at `subgraph/datasource/x.gql.json`.

We do this by defining entities in the schema. Think of each of these entities as database objects.

The data we receive from the blockchain events is structed and stored according to how the schema is defined. The user-facing apps query for blockchain data against the data model defined here.

Every indexing module we offer is designed with careful detail so that you can query for any information you will need from the blockchain events.\*

In case you are wondering, the schema are not defined in the graphql format but rather in a dedicated json format to allow for composability. This can then be assembled and compiled to graphql.

### 2. The Subgraph Manifest

This is a YAML file which describes the datasources that will be indexed. Mostly, the datasources are the contracts you want to mirror.

The template to generate the subgraph manifest for an indexing module `x` is located at `subgraph/datasource/x.yaml`.

SettleMint's indexing modules do all the heavy lifting of configuring the correct contracts, events and handlers for you so you can have your dApp up and running faster than ever.\*

### 3. The Mappings

The handlers in the mappings actually convert data coming from the events to the entities defined in the schema.

The mappings for an indexing module `x` are defined in `subgraph/datasources/x.ts`.

Often, they call helper functions, defined in `subgraph/fetch/x.ts` (`x` is the name of the indexing module) which fetches certain entities from the storage as needed.

We provide you with fully configured handlers, which can handle the various different events emitted by the contracts in the templatesets. With this, you can simply run `yarn graph:all` and have fully operational, production level indexers out-of-the-box.

If you want to learn more about mappings, feel free to continue reading on until the end of this sub-section.
The handlers in the mappings are called when the event they are linked to is emitted. The respective event is passed as an input parameter to the handler. Then, they create or update the entities you define in [the Schema](##1.-the-schema) based on the information emitted by the event. Lastly, they save the changes in the storage.

The mappings are written in AssemblyScript which can be compiled to WASM. It is a stricter subset of TypeScript.

## Indexing on-chain data

For general usage see the [More Information](##more-information) paragraph below.

This template set uses 3 main smart contracts:

1. CrowdSale
2. VestingVault
3. VestingWallet

Each of these smart contracts have a dedicated indexing module.

### 1. crowdsale Indexing Module

The crowdsale indexing module has 3 main and 1 helper file:

1. `subgraph/datasource/crowdsale.gql.json` - Schema definition file
2. `subgraph/datasource/crowdsale.yaml` - Subgraph manifest template file
3. `subgraph/datasource/crowdsale.ts` - Mapping functions file

And a helper file at `subgraph/fetch/crowdsale.ts`

#### 1. crowdsale Schema

We define 3 entities in the schema, the main ones are:

1. `CrowdSaleContract`

   This is the entity modelling the actual crowdsale contract. Its fields reflect the state variables declared in the `CrowdSale` contract. It also stores a list of token purchase events which have been emitted by the `CrowdSale` contract.

2. `CrowdSaleTokenPurchase`

   This is the entity representing the `TokenPurchase` event emitted by the `CrowdSale` contract.
   Its fields represent the information emitted by the event.

   For example, to get a list of all the `CrowdSaleTokenPurchase` events emitted by a `CrowdSale` contract, you can use the query:

   ```graphql
   {
     crowdSaleTokenPurchases(where: { id: "0xYourCrowdSaleContractAddress" }) {
       purchaser {
         id
       }
       tokenAmount
     }
   }
   ```

#### 2. crowdsale Subgraph Manifest Template

The field of interest to us in the subgraph manifest template at `subgraph/datasource/crowdsale.yaml` is the `eventHandlers` field.

Here, we list the events we want to listen to, as given here:

```yaml
- event: TokensPurchased(indexed address,indexed address,uint256,uint256)
  handler: handleTokensPurchased
```

Here, we listen to the `TokensPurchased` event emitted by the `CrowdSale` contract. When that event is emitted, we call the `handleTokensPurchased` mapping function defined in `subgraph/datasource/crowdsale.ts`

#### 3. crowdsale Mapping function

The mapping functions for the `crowdsale` indexing module are defined in `subgraph/datasource/crowdsale.ts`

It is advisable to run `graph:config`, `graph:compile`, and `graph:codegen` tasks before playing around with this file to generate types and classes.\*\*

Okay, now that we have our types and classes, let's see how they are used.

The `handleTokensPurchased` handler takes in the `TokensPurchasedEvent` event. It performs three main tasks:

- upserts the fields on the corresponding `CrowdSaleContract` entity the event was emitted by.
- creates a new `CrowdSaleTokenPurchase` entity to keep a track of the events emitted by the contract
- saves the updated changes in the storage

### 2. vestingvault Indexing Module

The vestingvault indexing module has 3 main and 1 helper file:

1. `subgraph/datasource/vestingvault.gql.json` - Schema definition file
2. `subgraph/datasource/vestingvault.yaml` - Subgraph manifest template file
3. `subgraph/datasource/vestingvault.ts` - Mapping functions file

And a helper file at `subgraph/fetch/vestingvault.ts`

#### 1. vestingvault Schema

We define 4 entities in the schema, the main ones are:

1. `VestingVaultContract`

   This is the entity modelling the actual `VestingVault` contract. Its fields reflect the state variables declared in the contract. It also stores a list of each of the events which are emitted by the contract.

2. `Vesting`

   This is the entity representing the `Vesting` struct defined in the `IVestingVault` interface.
   Its fields reflect the fields of the `Vesting` struct.

   For example, to get a list of all the `Vesting`s for a `VestingVault` contract, you can use the query:

   ```graphql
   {
     vestings(where: { id: "0xYourVestingVaultContractAddress" }) {
       tokenAmount
       releaseTime
       beneficiary {
         id
       }
     }
   }
   ```

3. `VestingLockedIn`

   This is the entity representing the `VestingLockedIn` event emitted by the `VestingVault` contract.
   Its fields represent the information emitted by the event.

   For example, to get a list of all the `VestingLockedIn` events emitted by a `VestingVault` contract, you can use the query:

   ```graphql
   {
     vestingLockedIns(where: { id: "0xYourVestingVaultContractAddress" }) {
       tokenAmount
       releaseTime
       beneficiary {
         id
       }
       timestamp
       transaction {
         id
       }
     }
   }
   ```

4. `VestingReleased`

   This is the entity representing the `VestingReleased` event emitted by the `VestingVault` contract.
   Its fields represent the information emitted by the event.

   For example, to get a list of all the `VestingReleased` events emitted by a `VestingVault` contract, you can use the query:

   ```graphql
   {
     vestingReleaseds(where: { id: "0xYourVestingVaultContractAddress" }) {
       tokenAmount
       beneficiary {
         id
       }
       timestamp
       transaction {
         id
       }
     }
   }
   ```

#### 2. vestingvault Subgraph Manifest Template

The field of interest to us in the subgraph manifest template at `subgraph/datasource/vestingvault.yaml` is the `eventHandlers` field.

Here, we list the events we want to listen to, as given here:

```yaml
- event: VestingLockedIn(indexed address,uint256,uint256)
  handler: handleVestingLockedIn
- event: VestingReleased(indexed address,uint256,uint256)
  handler: handleVestingReleased
```

Here, we listen to the `VestingLockedIn`, `VestingReleased` events emitted by the `VestingVault` contract. When any of these events are emitted, we call their respective mapping function defined in `subgraph/datasource/vestingvault.ts`

#### 3. vestingvault Mapping function

The mapping functions for the `vestingvault` indexing module are defined in `subgraph/datasource/vestingvault.ts`

It is advisable to run `graph:config`, `graph:compile`, and `graph:codegen` tasks before playing around with this file to generate types and classes.\*\*

Okay, now that we have our types and classes, let's see how they are used.

The handlers for each of the events take in their corresponding event as a parameter.

Both of them perform three main tasks:

- upsert the specific fields on the corresponding `VestingVault` entity the event was emitted by.
- creates a new entity for the event to keep track of the events emitted by the contract
- saves the updated changes in the storage

### 3. VestingWallet

### 2. vestingwallet Indexing Module

The vestingwallet indexing module has 3 main and 1 helper file:

1. `subgraph/datasource/vestingwallet.gql.json` - Schema definition file
2. `subgraph/datasource/vestingwallet.yaml` - Subgraph manifest template file
3. `subgraph/datasource/vestingwallet.ts` - Mapping functions file

And a helper file at `subgraph/fetch/vestingwallet.ts`

#### 1. vestingwallet Schema

We define 3 entities in the schema, the main ones are:

1. `VestingWalletContract`

   This is the entity modelling the actual `VestingWallet` contract. Its fields reflect the state variables declared in the contract. It also stores a list of each of the events which are emitted by the contract.

2. `EtherReleased`

   This is the entity representing the `EtherReleased` event emitted by the `VestingWallet` contract.
   Its fields represent the information emitted by the event.

   For example, to get a list of all the `EtherReleased` events emitted by a `VestingWallet` contract, you can use the query:

   ```graphql
   {
     etherReleaseds(where: { id: "0xYourVestingWalletContractAddress" }) {
       from {
         id
       }
       to {
         id
       }
       amount
     }
   }
   ```

3. `ERC20Released`

   This is the entity representing the `ERC20Released` event emitted by the `VestingWallet` contract.
   Its fields represent the information emitted by the event.

   For example, to get a list of all the `ERC20Released` events emitted by a `VestingWallet` contract, you can use the query:

   ```graphql
   {
     erc20Releaseds(where: { id: "0xYourVestingWalletContractAddress" }) {
       token {
         name
         symbol
       }
       from {
         id
       }
       to {
         id
       }
       amount
     }
   }
   ```

#### 2. vestingwallet Subgraph Manifest Template

The field of interest to us in the subgraph manifest template at `subgraph/datasource/vestingwallet.yaml` is the `eventHandlers` field.

Here, we list the events we want to listen to, as given here:

```yaml
- event: ERC20Released(indexed address,uint256)
  handler: handleERC20Released
- event: EtherReleased(uint256)
  handler: handleEtherReleased
```

Here, we listen to the `ERC20Released`, `EtherReleased` events emitted by the `VestingWallet` contract. When any of these events are emitted, we call their respective mapping function defined in `subgraph/datasource/vestingwallet.ts`

#### 3. vestingwallet Mapping function

The mapping functions for the `vestingwallet` indexing module are defined in `subgraph/datasource/vestingwallet.ts`

It is advisable to run `graph:config`, `graph:compile`, and `graph:codegen` tasks before playing around with this file to generate types and classes.\*\*

Okay, now that we have our types and classes, let's see how they are used.

There are 2 mapping functions `handleEtherReleased`, `handleERC20Released`. Both of them perform the same general task:

- upsert the specific fields on the corresponding `VestingWallet` entity the event was emitted by.
- creates a new entity for the event to keep track of the events emitted by the contract
- saves the updated changes in the storage

## Note

Its worth mentioning that in the example queries given above, you should pass your contract's addresses as a query parameter after converting it to lowercase. This is because the contract addresses are saved as lowercase in the store.

\*Our indexing module schema and handlers are built to support the events emitted from the smart contract template set. Should you tweak the definition of the events in the templatesets, please be sure to propagate those changes over to the respective indexing module. If you are stuck, we are here to help.

\*\*Before using this file, it is recommended to run the tasks `graph:config`, `graph:compile` and `graph:codegen`.

The `graph:codegen` task is where the types/classes are generated based on the entities defined in the schema (at `subgraphs > x.gql.json`). These types/classes are imported and used in the mapping functions.

Without running this task, you will run into several `Cannot find module..` linter errors while trying to use this file.

## More Information

- [Leverage the Graph Middleware to index on chain data](./docs/graph-middleware.md)
- [Collaborate with your colleagues over GitHub](./docs/collaborate-over-github.md)
- [Learn about the different tasks available for development](./docs/development-tasks.md)
- [What all the folders and files in this set are for](./docs/project-structure.md)
