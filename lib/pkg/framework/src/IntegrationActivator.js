"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const superagent_1 = __importDefault(require("superagent"));
class IntegrationActivator {
    constructor(cfg) {
        this.config = cfg;
    }
    /**
     * Request an access token to communicate with specified connector.
     * @returns Promise<string>
     */
    async requestConnectorToken({ ctx, lookupKey }) {
        const tokenPath = `api/${lookupKey}/token`;
        const params = ctx.state.params;
        const baseUrl = `${params.endpoint}/v2/account/${params.accountId}/subscription/${params.subscriptionId}/connector/${this.config.entityId}`;
        const tokenResponse = await superagent_1.default
            .get(`${baseUrl}/${tokenPath}`)
            .set('Authorization', `Bearer ${params.functionAccessToken}`);
        return tokenResponse.body.access_token;
    }
}
exports.default = IntegrationActivator;
//# sourceMappingURL=IntegrationActivator.js.map