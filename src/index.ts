import {fileSync} from 'tmp';
import {safeDump, DEFAULT_FULL_SCHEMA} from 'js-yaml';
import {writeFileSync} from 'fs';
import {spawnSync} from 'child_process';
import {resolve} from 'path';

export function readConfig(filename: string) {
  // tslint:disable-next-line: strict-type-predicates
  if (/\.tsx?$/.test(filename) && typeof jest === 'undefined') {
    const tsNode: typeof import('ts-node') = require('ts-node');
    const compilerOptions = {
      allowSyntheticDefaultImports: true,
      module: 'CommonJS',
    };
    tsNode.register({
      transpileOnly: true,
      compilerOptions,
    });
  }
  let result = require(resolve(filename));
  if (result.__esModule) {
    result = result.default;
  }
  return Array.isArray(result) ? result : [result];
}

export function print(filename: string) {
  return (
    '---\n' +
    readConfig(filename)
      .map((v) =>
        safeDump(v, {
          schema: DEFAULT_FULL_SCHEMA,
        }).trim(),
      )
      .join('\n---\n') +
    '\n---\n'
  );
}

function spawn(args: readonly string[]) {
  const result = spawnSync('kubectl', args, {
    stdio: 'inherit',
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status) {
    const err = new Error(`kubectl had non-zero exit code: ${result.status}`);
    (err as any).code = 'EXIT_NON_ZERO';
    (err as any).exitCode = result.status;
    throw err;
  }
}
export function run(
  cmd: string,
  filename: string | undefined,
  otherArgs: readonly string[] = [],
) {
  if (filename) {
    const yaml = print(filename);
    const tmpFile = fileSync();
    try {
      writeFileSync(tmpFile.name, yaml);
      spawn([cmd, '-f', tmpFile.name, ...otherArgs]);
    } finally {
      tmpFile.removeCallback();
    }
  } else {
    spawn([cmd, ...otherArgs]);
  }
}
export function apply(filename: string, otherArgs: readonly string[] = []) {
  if (!filename) {
    throw new Error('Missing -f parameter');
  }
  run('apply', filename, otherArgs);
}

export function diff(filename: string, otherArgs: readonly string[] = []) {
  if (!filename) {
    throw new Error('Missing -f parameter');
  }
  run('diff', filename, otherArgs);
}

export function destroy(filename: string, otherArgs: readonly string[] = []) {
  if (!filename) {
    throw new Error('Missing -f parameter');
  }
  run('delete', filename, otherArgs);
}
