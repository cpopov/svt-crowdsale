## Project structure

This project is set up using [Hardhat Ethereum development environment](https://hardhat.org/) to provide the best
developer experience possible. In the Explorer panel on the left, you will find all the files and folders of which we describe below.

```plain
root
|    README.md                          # This file
|    hardhat.config.ts                  # Hardhat configuration file https://hardhat.org/config/
|    .solhint.json                      # Configuration file for the solhint linter
|                                       # all the information a dAPP needs to interact with the contracts.
|
+--+ .secrets
|  |   default.hardhat.config.ts        # This read-only file is prepopulated with the access settings and
|                                       # credentials from your blockchain node. These values are used in the
|                                       # hardhat configuration file. If you want to use different settings,
|                                       # modify them there.
|
+--+ assets                             # This folder contains all the assets that are used in the project
|  |                                    # Often configuration files or images
|
+--+ abi                                # The compile task creates ABI fields for each contract in this folder
|  |   ...                              # For each import you get a ABI file as well
|
+--+ contracts                          # This folder contains your Solidity smart contracts.
|
+--+ deploy                             # This folder contains the scripts to deploy the contract to your
|  |                                    # blockchain node. (https://hardhat.org/plugins/hardhat-deploy.html)
|
+--+ deployments                        # This folder is generated in the deploy task and contains the bytecode and
|  |                                    # addresses of all your contracts on chain. Store this folder in version control
|  |                                    # as it is a crucial piece of information to work with your contract system
+--+ subgraphs                          # This folder contains the indexing logic you can leverage with the 
|  |                                    # Graph Middleware deployable in the platform
+--+ tasks                              # Here you can find all the Hardhat tasks that this set provides with the full
|  |                                    # sourcecode to adjust as needed for your usecase.
+--+ test                               # This folder contains the test suite for your contracts using
|  |                                    # ethers.js and waffle. (https://hardhat.org/guides/waffle-testing.html)
+--+ typechain                          # A generated folder by the compile task that has the Typescript types for your
   |                                    # contracts
```
