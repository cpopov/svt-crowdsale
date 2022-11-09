## Development Tasks

While the terminal (shortcut: ^⇧` or via the hamburger menu top left corner) is a fully functional linux based terminal to execute all Hardhat commands, on the left bottom in the Exporer panel you will find the TASK RUNNER panel that provides one click access to predefined commands for the most common actions.

### lint (yarn lint)

Uses [solhint](https://protofire.github.io/solhint/) to lint your contracts. The configuration can be found in `.solhint`.

```plain
> Executing task: yarn run lint <

yarn run v1.22.5
$ npx solhint 'contracts/**/*.sol'

contracts/GenericToken.sol
  45:3  error  Explicitly mark visibility in function  func-visibility

✖ 1 problem (1 error, 0 warnings)

error Command failed with exit code 1.
info Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
The terminal process "bash '-c', 'yarn run lint'" terminated with exit code: 1.
```

### compile (yarn compile)

The compile taks compiles your solidity contracts to their ABI and bytecode and generates typescript types for them using [Typechain](https://github.com/ethereum-ts/TypeChain). The typescript types provide typesafety, auto completion and checks to prevent the use of wrong functions or arguments.

```plain
> Executing task: yarn run compile <

yarn run v1.22.5
$ npx hardhat compile
Compiling 11 files with 0.8.4
Generating typings for: 12 artifacts in dir: typechain for target: ethers-v5
Successfully generated 23 typings!
Compilation finished successfully
Done in 6.35s.

Terminal will be reused by tasks, press any key to close it.
```

### deploy (yarn deploy)

This task deploys your smart contracts (using the script in the deploy folder) to the blockchain node you selected when launching this IDE (into in the .secrets folder).

```plain
> Executing task: yarn run deploy <

yarn run v1.22.5
$ npx hardhat deploy --export bpaas.json --network bpaas
Nothing to compile
No need to generate any newer typings.

deploying "GenericToken" (tx: 0x7d8433594d82308aed36703186bbcf4656586a711087eec3a438c7ec46de85bc)...: deployed at 0x0735BAACebc86A5FC8Cf7b479787C1cBDD727487 with 1639306 gas
Done in 18.91s.

Terminal will be reused by tasks, press any key to close it.
```

The deploy task does not execute the same deploy script twice (it will mention something like `reusing "GenericToken" at 0x0735BAACebc86A5FC8Cf7b479787C1cBDD727487`) in the terminal when you do. By adding files wit higher initial numbers in the filename you can modify your smart contact system over time.

If you do want to start fresh, use the `deploy:reset` task. This will overwrite all the deployments folder and bpaas.json file. Use with caution!

The `deploy:local` task is for testing your deploy scripts and deploys to the internal Hardhat network.

> Please note that deploying to networks that require a gasprice, espacially mainnets, require you to fund the account used to deploy with the native cryptocurrency of that network. (ETH, BNB, AVAX, etc)
