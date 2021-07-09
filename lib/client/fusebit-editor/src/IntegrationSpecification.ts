import * as Model from '@fusebit/schema';

/**
 * Specification of a single integration. Used when creating a [[EditorContext]].
 *
 * Example of a simple integration specification:
 *
 * ```javascript
 * {
 *    "id": "integ",
 *    "data": {
 *      "files": {
 *        "package.json": "",
 *        "integration.js": ""
 *      },
 *      "handler": "./integration",
 *      "configuration": {}
 *      "components": [
 *        "name": "slack",
 *        "entityId": "slack-connector",
 *        "entityType": "connector",
 *        "skip": "false",
 *        "path": "/api/configure",
 *        "package": "@fusebit-int/pkg-oauth-integration",
 *        "dependsOn": []
 *      ],
 *      "componentTags": {},
 *    },
 *    "tags": {},
 *    "version": "c177f4dd-dd7e-4c46-b6c0-016a78b7e201"
 * }
 * ```
 */
export type IIntegrationSpecification = Model.IIntegration;
