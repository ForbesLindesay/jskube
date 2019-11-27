import {fileSync} from 'tmp';
import {safeDump, DEFAULT_FULL_SCHEMA} from 'js-yaml';
import {writeFileSync} from 'fs';
import {spawnSync} from 'child_process';

// js-yaml -> safeDump

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
  let result = require(filename);
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

export function apply(args: readonly string[]) {
  const filename = args.find((a, i) => args[i - 1] === '-f');
  const otherArgs = args.filter((a, i) => a !== '-f' && args[i - 1] !== '-f');
  if (!filename) {
    throw new Error('Missing -f parameter');
  }
  const yaml = print(filename);
  const tmpFile = fileSync();
  try {
    writeFileSync(tmpFile.name, yaml);
    const result = spawnSync(
      'kubectl',
      ['apply', '-f', tmpFile.name, ...otherArgs],
      {
        stdio: 'inherit',
      },
    );
    if (result.error) {
      throw result.error;
    }
    if (result.status) {
      throw new Error(`kubectl had non-zero exit code: ${result.status}`);
    }
  } finally {
    tmpFile.removeCallback();
  }
}

export function diff(args: readonly string[]) {
  const filename = args.find((a, i) => args[i - 1] === '-f');
  const otherArgs = args.filter((a, i) => a !== '-f' && args[i - 1] !== '-f');
  if (!filename) {
    throw new Error('Missing -f parameter');
  }
  const yaml = print(filename);
  const tmpFile = fileSync();
  try {
    writeFileSync(tmpFile.name, yaml);
    const result = spawnSync(
      'kubectl',
      ['diff', '-f', tmpFile.name, ...otherArgs],
      {
        stdio: 'pipe',
      },
    );
    process.stderr.write(result.stderr);
    process.stdout.write(result.stdout);
    if (result.error) {
      throw result.error;
    }
    if (result.status) {
      throw new Error(`kubectl had non-zero exit code: ${result.status}`);
    }
  } finally {
    tmpFile.removeCallback();
  }
}
