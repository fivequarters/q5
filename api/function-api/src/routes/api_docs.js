const Express = require('express');
const Path = require('path');
const YAML = require('yamljs');
const Swagger_ui = require('swagger-ui-express');

let router = Express.Router();
var swagger_spec = YAML.load(Path.join(__dirname, '../../api_v1.yaml'));

router.use('/', Swagger_ui.serve);
router.get('/', Swagger_ui.setup(swagger_spec));

module.exports = router;
