import * as fs from 'fs';
import * as yaml from 'js-yaml';

const OUTPUT_DIR = '../../../.github/workflows';
const INPUT_DIR = './yaml';
const BASE_YML = 'base';

const BANNER = [
  '###################################################################',
  '# Auto-created by the cicd-actions tool',
  '',
].join('\n');

const publishAll = [
  'publish_function_api',
  'publish_fusebit_cli',
  'publish_fusebit_editor',
  'publish_fusebit_ops_cli',
  'publish_api_docs',
];
const fullBuild = ['setup_env', 'full_build'];

const specs = [
  { name: 'Checkout the project', inputs: ['checkout'], output: 'checkout' },
  { name: 'Full build', inputs: ['checkout', ...fullBuild], output: 'full_build' },
  {
    name: 'Deploy to us-west-2/stage and Test',
    inputs: ['checkout', ...fullBuild, 'publish_function_api', 'deploy_test'],
    output: 'build_test',
  },
  {
    name: 'Publish All Artifacts',
    inputs: [ 'checkout', 'publish_release', ...fullBuild, ...publishAll],
    output: 'publish',
    on_trigger: {push: {branches: ["master"]}}
  },
  {
    name: 'Publish function-api',
    inputs: ['checkout', ...fullBuild, 'publish_function_api'],
    output: 'publish_function_api',
  },
  {
    name: 'Publish the Website',
    inputs: ['checkout', ...fullBuild, 'publish_website'],
    output: 'publish_website',
  },
  {
    name: 'Publish API Documentation',
    inputs: ['checkout', ...fullBuild, 'publish_api_docs'],
    output: 'publish_api_docs',
  },
];

function buildSpec(name: string, inputs: string[], output: string, on_trigger?: any) {
  let base = yaml.load(fs.readFileSync(`${INPUT_DIR}/${BASE_YML}.yml`, 'utf8')) as any;
  base.name = name;
  if (on_trigger) {
    base.on = on_trigger;
  }

  inputs.forEach((f) => {
    const entry = yaml.load(fs.readFileSync(`${INPUT_DIR}/${f}.yml`, 'utf8')) as any;
    base.jobs.deploy.steps = base.jobs.deploy.steps.concat(entry.steps);
  });

  fs.writeFileSync(`${OUTPUT_DIR}/${output}.yml`, BANNER + yaml.dump(base, { noCompatMode: true }));
}

specs.forEach((spec) => buildSpec(spec.name, spec.inputs, spec.output, spec.on_trigger));
