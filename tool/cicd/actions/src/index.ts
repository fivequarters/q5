import * as fs from 'fs';
import * as yaml from 'js-yaml';

const OUTPUT_DIR = '../../../.github/workflows';
const INPUT_DIR = './yaml';
const BASE_YML = 'base';

// Using a separate base YAML for local runners because local runners act different from regular runners.
const LOCAL_BASE_YML = 'local_base';

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
  { name: 'Checkout the project', inputs: ['checkout', 'publish_slack'], output: 'checkout' },
  { name: 'Full build', inputs: ['checkout', ...fullBuild, 'publish_slack'], output: 'full_build' },
  {
    name: 'Publish All Artifacts',
    inputs: ['checkout', ...fullBuild, ...publishAll, 'publish_slack'],
    output: 'publish',
  },
  {
    name: 'Publish And Tag All Artifacts',
    inputs: ['checkout', 'publish_tags', ...fullBuild, ...publishAll, 'publish_slack'],
    output: 'publish_and_tag',
    options: { on_trigger: { push: { branches: ['master'] } } },
  },
  {
    name: 'Publish function-api',
    inputs: ['checkout', ...fullBuild, 'publish_function_api', 'publish_slack'],
    output: 'publish_function_api',
  },
  {
    name: 'Publish the Website',
    inputs: ['checkout', ...fullBuild, 'publish_website', 'publish_slack'],
    output: 'publish_website',
  },
  {
    name: 'Publish API Documentation',
    inputs: ['checkout', ...fullBuild, 'publish_api_docs', 'publish_slack'],
    output: 'publish_api_docs',
  },
  {
    name: 'Test Function-API',
    inputs: ['checkout', 'local_env_files', 'full_build_no_qualify', 'publish_all_pkg', 'deploy_test', 'publish_slack'],
    output: 'test_function_api',
    options: {
      on_trigger: {
        pull_request: {
          branches: 'master',
          types: ['ready_for_review', 'review_requested'],
        },
      },
      runner_type: 'self-hosted',
    },
  },
];

function buildSpec(name: string, inputs: string[], output: string, options: any = {}) {
  // Used when custom runners are used. Currently we only need self-hosted runners when used for automated tests.
  let base: any =
    options.runner_type === 'self-hosted'
      ? yaml.load(fs.readFileSync(`${INPUT_DIR}/${LOCAL_BASE_YML}.yml`, 'utf8'))
      : yaml.load(fs.readFileSync(`${INPUT_DIR}/${BASE_YML}.yml`, 'utf8'));
  base.name = name;
  if (options.on_trigger) {
    base.on = options.on_trigger;
  }

  inputs.forEach((f) => {
    const entry = yaml.load(fs.readFileSync(`${INPUT_DIR}/${f}.yml`, 'utf8')) as any;
    base.jobs.deploy.steps = base.jobs.deploy.steps.concat(entry.steps);
  });

  fs.writeFileSync(`${OUTPUT_DIR}/${output}.yml`, BANNER + yaml.dump(base, { noCompatMode: true }));
}

specs.forEach((spec) => buildSpec(spec.name, spec.inputs, spec.output, spec.options));
