#!/usr/bin/env node

import {print, diff, apply, run, destroy, getEnvVars} from '.';

const args = process.argv.slice(2);

const filename = args.find((_a, i, as) => i !== 0 && as[i - 1] === '-f')!;
const otherArgs = args
  .slice(1)
  .filter((a, i, as) => a !== '-f' && (i === 0 || as[i - 1] !== '-f'));

try {
  switch (args[0]) {
    case 'get-env-vars':
      // user, namespace, clusterName
      getEnvVars({
        user: args.find((_a, i, as) => i !== 0 && as[i - 1] === '--user'),
        namespace: args.find(
          (_a, i, as) => i !== 0 && as[i - 1] === '--namespace',
        ),
        clusterName: args.find(
          (_a, i, as) => i !== 0 && as[i - 1] === '--cluster',
        ),
      });
      break;
    case 'print':
      process.stdout.write(print(filename));
      break;
    case 'diff':
      diff(filename, otherArgs);
      break;
    case 'apply':
      apply(filename, otherArgs);
      break;
    case 'destroy':
    case 'delete':
      destroy(filename, otherArgs);
      break;
    default:
      run(args[0], filename, otherArgs);
      break;
  }
} catch (ex) {
  if (ex.code === 'EXIT_NON_ZERO') {
    process.exit(ex.exitCode || 1);
  } else {
    throw ex;
  }
}
