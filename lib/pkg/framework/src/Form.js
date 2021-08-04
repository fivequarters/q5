"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const formTemplate = fs.readFileSync(__dirname + '/form/form.html', { encoding: 'utf8' });
/**
 * Create an HTML Form, using MaterialUI, from the supplied JSON Schema.
 */
const Form = (spec) => {
    const form = (spec.template || formTemplate)
        .replace('##schema##', JSON.stringify(spec.schema))
        .replace('##uischema##', JSON.stringify(spec.uiSchema))
        .replace('##data##', JSON.stringify(spec.data))
        .replace('##windowTitle##', spec.windowTitle)
        .replace('##dialogTitle##', spec.dialogTitle)
        .replace('##state##', JSON.stringify(spec.state))
        .replace('##submitUrl##', `"${spec.submitUrl}"`)
        .replace('##cancelUrl##', `"${spec.cancelUrl}"`);
    return [form, 'text/html; charset=UTF-8'];
};
exports.Form = Form;
//# sourceMappingURL=Form.js.map