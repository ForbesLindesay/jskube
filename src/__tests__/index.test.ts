import {print} from '..';

test('print', () => {
  expect(print(`${__dirname}/fixtures/ingress.ts`)).toMatchInlineSnapshot(`
    "---
    apiVersion: extensions/v1beta1
    kind: Ingress
    metadata:
      name: web-app-template-ingress
      namespace: web-app-template
    spec:
      tls:
        - hosts:
            - web-app-template.makewebtech.org
          secretName: web-app-template-ingress-tls
      rules:
        - host: web-app-template.makewebtech.org
          http:
            paths:
              - backend:
                  serviceName: web-app-template
                  servicePort: 80
    ---
    apiVersion: cert-manager.io/v1alpha2
    kind: Certificate
    metadata:
      name: web-app-template-ingress
      namespace: web-app-template
    spec:
      secretName: web-app-template-ingress-tls
      issuerRef:
        name: letsencrypt-prod
        kind: ClusterIssuer
      commonName: web-app-template.makewebtech.org
      dnsNames:
        - web-app-template.makewebtech.org
    ---
    apiVersion: extensions/v1beta1
    kind: Ingress
    metadata:
      name: web-app-template-ingress-staging
      namespace: web-app-template
    spec:
      tls:
        - hosts:
            - web-app-template.staging.makewebtech.org
          secretName: web-app-template-ingress-tls-staging
      rules:
        - host: web-app-template.staging.makewebtech.org
          http:
            paths:
              - backend:
                  serviceName: web-app-template-staging
                  servicePort: 80
    ---
    apiVersion: cert-manager.io/v1alpha2
    kind: Certificate
    metadata:
      name: web-app-template-ingress-staging
      namespace: web-app-template
    spec:
      secretName: web-app-template-ingress-tls-staging
      issuerRef:
        name: letsencrypt-prod
        kind: ClusterIssuer
      commonName: web-app-template.staging.makewebtech.org
      dnsNames:
        - web-app-template.staging.makewebtech.org
    ---
    "
  `);
});
