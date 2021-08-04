import { JsonSchema } from './models/jsonSchema';
import { UISchemaElement } from './models/uischema';
/**
 * Programmatically specify a form to be rendered in MaterialUI, allowing a user to specify configuration
 * during an integration configuration.
 */
interface IFormSpecification {
    /** A schema for the data, in the JsonSchema format */
    schema: JsonSchema;
    /** The layout of the UI the form should provide the user. */
    uiSchema: UISchemaElement;
    /** Default values to populate the form with. */
    data: any;
    /** Additional state for the form to supply when submitted. */
    state: any;
    /** Post the form results to the submitUrl. */
    submitUrl: string;
    /** Send the user to the cancelUrl on cancellation. */
    cancelUrl: string;
    /** Title of the dialog surrounding the form. */
    dialogTitle: string;
    /** Title of the window in the browser. */
    windowTitle: string;
    /**
     * Optional HTML template that contains the following artifacts to be replaced by other values in the
     * IFormSpecification:
     *   - ##schema##
     *   - ##uischema##
     *   - ##data##
     *   - ##state##
     *   - ##dialogTitle##
     *   - ##windowTitle##
     *   - ##submitUrl##
     *   - ##cancelUrl##
     */
    template?: string;
}
/**
 * Create an HTML Form, using MaterialUI, from the supplied JSON Schema.
 */
declare const Form: (spec: IFormSpecification) => string[];
export { Form };
//# sourceMappingURL=Form.d.ts.map