"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const normalizeResource = (resource) => {
    const delimiter = '/';
    const rootSlash = resource[0] === delimiter ? '' : delimiter;
    const endingSlash = resource[resource.length - 1] === delimiter ? '' : delimiter;
    return `${rootSlash}${resource}${endingSlash}`;
};
function doesResourceAuthorize(grantedResource, requestedResource) {
    return requestedResource.indexOf(grantedResource) === 0;
}
function doesActionAuthorize(grantedAction, requestedAction) {
    if (grantedAction === requestedAction) {
        return true;
    }
    const grantedSegments = grantedAction.split(':');
    const requestedSegments = requestedAction.split(':');
    for (let i = 0; i < requestedSegments.length; i++) {
        if (grantedSegments[i]) {
            if (grantedSegments[i] === '*') {
                return true;
            }
            else if (grantedSegments[i] === requestedSegments[i]) {
                // ok, continue to check the next segment
            }
            else {
                return false;
            }
        }
        else {
            return false;
        }
    }
    return false;
}
function doesAccessEntryAuthorize(accessEntry, action, resource) {
    const actionAuth = doesActionAuthorize(accessEntry.action, action);
    const resourceAuth = doesResourceAuthorize(normalizeResource(accessEntry.resource), resource);
    return actionAuth && resourceAuth;
}
exports.authorize = (action) => {
    return async (ctx, next) => {
        var _a, _b;
        const resource = normalizeResource(ctx.state.params.resourcePath);
        const allowEntries = ((_b = (_a = ctx.state.fusebit) === null || _a === void 0 ? void 0 : _a.caller) === null || _b === void 0 ? void 0 : _b.permissions.allow) || [];
        for (const allow of allowEntries) {
            if (doesAccessEntryAuthorize(allow, action, resource)) {
                return next();
            }
        }
        return ctx.throw(403);
    };
};
//# sourceMappingURL=authorize.js.map