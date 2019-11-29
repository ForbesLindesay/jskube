import {fileSync} from 'tmp';
import {safeDump, DEFAULT_FULL_SCHEMA} from 'js-yaml';
import {writeFileSync} from 'fs';
import {spawnSync, SpawnSyncOptions, SpawnSyncReturns} from 'child_process';
import {resolve} from 'path';

interface GetEnvVarOptions {
  user?: string;
  namespace?: string;
  clusterName?: string;
}
function handleSpawnSyncResult<T>(res: SpawnSyncReturns<T>) {
  if (res.error) {
    throw res.error;
  }
  if (res.status) {
    const err = new Error(`kubectl had non-zero exit code: ${res.status}`);
    (err as any).code = 'EXIT_NON_ZERO';
    (err as any).exitCode = res.status;
    throw err;
  }
  return res;
}
export function getEnvVars({user, namespace, clusterName}: GetEnvVarOptions) {
  console.warn({user: user || 'cicd', namespace: namespace || 'default'});
  process.stdout.write('KUBERNETES_TOKEN=');
  handleSpawnSyncResult(
    spawnSync('sh', [], {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: `kubectl get secret $(kubectl get secret --namespace ${namespace ||
        'default'} | grep ${user ||
        'cicd'}-token | awk '{print $1}') --namespace ${namespace ||
        'default'} -o jsonpath='{.data.token}' | base64 --decode && echo ""`,
    }),
  );
  process.stdout.write('KUBERNETES_SERVER=');
  handleSpawnSyncResult(
    spawnSync('sh', [], {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: `kubectl config view -o jsonpath="{.clusters[?(@.name == \\"${clusterName ||
        "`kubectl config view -o jsonpath='{.current-context}'`"}\\")].cluster.server}" --raw && echo ""`,
    }),
  );
  process.stdout.write('KUBERNETES_CLUSTER_CERTIFICATE=');
  handleSpawnSyncResult(
    spawnSync('sh', [], {
      stdio: ['pipe', 'inherit', 'inherit'],
      input: `kubectl config view -o jsonpath="{.clusters[?(@.name == \\"${clusterName ||
        "`kubectl config view -o jsonpath='{.current-context}'`"}\\")].cluster.certificate-authority-data}" --raw && echo ""`,
    }),
  );
  // kubectl config view -o jsonpath='{.current-context}'
  // # KUBERNETES_TOKEN=
  // #   kubectl get secret $(kubectl get secret --namespace web-app-template | grep cicd-token | awk '{print $1}') --namespace web-app-template -o jsonpath='{.data.token}' | base64 --decode && echo ""
  // # KUBERNETES_SERVER=
  // #   kubectl config view -o jsonpath="{.clusters[?(@.name == \"`kubectl config view -o jsonpath='{.current-context}'`\")].cluster.server}" --raw && echo ""
  // # KUBERNETES_CLUSTER_CERTIFICATE=
  // #   kubectl config view -o jsonpath="{.clusters[?(@.name == \"`kubectl config view -o jsonpath='{.current-context}'`\")].cluster.certificate-authority-data}" --raw && echo ""
}
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

function spawn(args: readonly string[], options?: SpawnSyncOptions) {
  const result = spawnSync('kubectl', args, {
    stdio: 'inherit',
    ...options,
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
  return result;
}
export function run(
  cmd: string,
  filename: string | undefined,
  otherArgs: readonly string[] = [],
) {
  const extraArgs: string[] = [];
  if (process.env.KUBERNETES_SERVER && !otherArgs.includes('--server')) {
    extraArgs.push(`--server=${process.env.KUBERNETES_SERVER}`);
  }
  if (process.env.KUBERNETES_TOKEN && !otherArgs.includes('--token')) {
    extraArgs.push(`--token=${process.env.KUBERNETES_TOKEN}`);
  }
  const certFile =
    process.env.KUBERNETES_CLUSTER_CERTIFICATE &&
    !otherArgs.includes('--certificate-authority')
      ? fileSync()
      : undefined;
  try {
    if (certFile) {
      writeFileSync(
        certFile.name,
        Buffer.from(process.env.KUBERNETES_CLUSTER_CERTIFICATE!, 'base64'),
      );
      extraArgs.push(`--certificate-authority=${certFile.name}`);
    }
    if (filename) {
      const yaml = print(filename);
      const yamlFile = fileSync();
      try {
        writeFileSync(yamlFile.name, yaml);
        spawn([cmd, '-f', yamlFile.name, ...otherArgs, ...extraArgs]);
      } finally {
        yamlFile.removeCallback();
      }
    } else {
      spawn([cmd, ...otherArgs, ...extraArgs]);
    }
  } finally {
    if (certFile) certFile.removeCallback();
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
