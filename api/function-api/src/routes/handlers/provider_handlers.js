// TODO tjanczuk: remove nasty hack to circumvent the inability to reference projects that have allowJs set
// Remove the hack after the flexd-functions-lambda is fully converted to TypeScript:
// 1. Remove the eval from the line below
// 2. In tsconfig.json, add `"references": [{ "path": "../../../lib/server/flexd-functions-lambda" }]`

// exports.lambda = require("@5qtrs/flexd-functions-lambda");
exports.lambda = eval('require("@5qtrs/flexd-functions-lambda")');
