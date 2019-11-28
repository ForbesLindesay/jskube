# jskube

Configure Kuberenetes using TypeScript & JavaScript

## Installation

```
yarn global add jskube
```

If you're using TypeScript, also do:

```
yarn global add typescript ts-node
```

## Usage

config.ts

```ts
import Ingress from 'jskube/schema/ingress-extensions-v1beta1';

export function ingress(options: {
  name: string;
  namespace: string;
  host: string;
  secretName: string;
  serviceName: string;
}): Ingress {
  return {
    apiVersion: 'extensions/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: options.name,
      namespace: options.namespace,
    },
    spec: {
      tls: [{hosts: [options.host], secretName: options.secretName}],
      rules: [
        {
          host: options.host,
          http: {
            paths: [
              {
                backend: {
                  serviceName: options.serviceName,
                  servicePort: 80,
                },
              },
            ],
          },
        },
      ],
    },
  };
}
export function certificate(options: {
  name: string;
  namespace: string;
  host: string;
  secretName: string;
}) {
  return {
    apiVersion: 'cert-manager.io/v1alpha2',
    kind: 'Certificate',
    metadata: {
      name: options.name,
      namespace: options.namespace,
    },
    spec: {
      secretName: options.secretName,
      issuerRef: {
        name: 'letsencrypt-prod',
        kind: 'ClusterIssuer',
      },
      commonName: options.host,
      dnsNames: [options.host],
    },
  };
}

export default [
  ingress({
    name: 'web-app-template-ingress',
    namespace: 'web-app-template',
    host: 'web-app-template.makewebtech.org',
    secretName: 'web-app-template-ingress-tls',
    serviceName: 'web-app-template',
  }),
  certificate({
    name: 'web-app-template-ingress',
    namespace: 'web-app-template',
    host: 'web-app-template.makewebtech.org',
    secretName: 'web-app-template-ingress-tls',
  }),

  ingress({
    name: 'web-app-template-ingress-staging',
    namespace: 'web-app-template',
    host: 'web-app-template.staging.makewebtech.org',
    secretName: 'web-app-template-ingress-tls-staging',
    serviceName: 'web-app-template-staging',
  }),
  certificate({
    name: 'web-app-template-ingress-staging',
    namespace: 'web-app-template',
    host: 'web-app-template.staging.makewebtech.org',
    secretName: 'web-app-template-ingress-tls-staging',
  }),
];
```

Then run:

```
jskube apply -f config.ts
```

Commands:

- `jskube print -f foo.ts` - print the yaml for foo.ts
- `jskube apply -f foo.ts` - update the infrastructure to match foo.ts
- `jskube diff -f foo.ts` - show the changes if foo.ts is applied
- `jskube delete -f foo.ts` - delete all the resources in foo.ts (also aliased as `jskube destroy -f foo.ts`)
- all other commands passed through, but with the `-f` parameter handled by jskube
