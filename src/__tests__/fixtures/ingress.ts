import Ingress from '../../../schema/ingress-extensions-v1beta1';

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
  // kubectl describe certificate CERTIFICATE_NAME
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
