import { existsSync, readFileSync, writeFileSync } from 'fs';
import { task, types } from 'hardhat/config';
import { basename } from 'path';

task('compile-ui-info', 'Collect all information for the ui builder')
  .addOptionalParam('files', 'all the json files that need to be compiled', ``, types.string)
  .setAction(async ({ files }: { files: string }) => {
    let compiledJson: { [file: string]: unknown } = {};
    if (existsSync('./ui.info.json')) {
      compiledJson = JSON.parse(readFileSync('./ui.info.json', 'utf8'));
    }
    for (const file of files.split(',')) {
      compiledJson[basename(file)] = JSON.parse(readFileSync(file.trim(), 'utf8'));
    }
    writeFileSync('./ui.info.json', JSON.stringify(compiledJson, null, 2));
  });
