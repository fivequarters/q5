"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Manager_1 = require("./Manager");
exports.Handler = (handler, config) => {
    const manager = new Manager_1.Manager();
    let router;
    let routerError;
    try {
        router = require(handler).router;
        if (!router) {
            throw `No Router found on handler ${handler}`;
        }
    }
    catch (e) {
        routerError = e;
    }
    manager.setup(config, router, routerError); // Configure the system.
    return async (ctx) => {
        let result;
        try {
            result = await manager.handle(ctx);
        }
        catch (error) {
            console.log(`ERROR: `, error);
            return { body: { config, error, result, ctx } };
        }
        return result;
    };
};
//# sourceMappingURL=Handler.js.map