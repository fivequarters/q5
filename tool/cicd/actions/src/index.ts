import * as fs from 'fs';
import * as yaml from 'js-yaml';

interface ISpec {
  name: string;

  // The name of the yml files to include, in order
  inputs: string[];

  // The name of the output yml file in the .github/workflows directory
  output: string;

  options?: {
    // Trigger options
    on_trigger?: any;

    // Replacement base
    base?: string;

    // Is the workflow supposed to run on self-hosted instances?
    runner_type?: 'self-hosted';
  };
}

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
  'publish_everyauth_cli',
  'publish_fusebit_ops_cli',
  'publish_fusebit_schema',
  'publish_api_docs',
  'publish_proxy_secrets',
  'publish_api_readme_com',
];
const fullBuild = ['setup_env', 'full_build'];

const specs: ISpec[] = [
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
    name: 'Publish API Documentation to Readme.com',
    inputs: ['checkout', 'publish_api_readme_com', 'publish_slack'],
    output: 'publish_api_docs',
    options: {
      base: 'fast_base',
    },
  },
  {
    name: 'CICD: Test Function-API',
    inputs: [
      'checkout',
      'local_env_files',
      'clean_dirty_artifacts',
      'full_build_no_qualify',
      'cleanup_db',
      'publish_and_deploy_function_api.749',
      'deploy_test',
      'publish_slack',
    ],
    output: 'test_function_api',
    options: {
      on_trigger: 'pull_request',
      runner_type: 'self-hosted',
    },
  },
  {
    name: 'Delete Duplicate Function-API Test Runs',
    inputs: ['delete_previous_test_actions'],
    output: 'clean_old_tests',
    options: {
      on_trigger: 'pull_request',
      base: 'fast_base',
    },
  },
  {
    name: 'CICD: Test Function-API (Manual)',
    inputs: [
      'checkout',
      'local_env_files',
      'full_build_no_qualify',
      'cleanup_db',
      'publish_and_deploy_function_api.749',
      'deploy_test',
      'publish_slack',
    ],
    output: 'test_function_api-manual',
    options: {
      runner_type: 'self-hosted',
    },
  },
  {
    name: 'Deploy Dashboards',
    inputs: ['checkout', 'setup_env', 'deploy_dashboard'],
    output: 'deploy_dashboards',
  },
  {
    name: 'Publish Proxy Secrets',
    inputs: ['checkout', 'setup_env', 'publish_proxy_secrets', 'publish_slack'],
    output: 'publish_proxy_secrets',
  },
  {
    name: 'Publish Segment Files',
    inputs: ['checkout', 'setup_env', 'deploy_segment', 'publish_slack'],
    output: 'publish_segment',
    options: {
      on_trigger: {
        schedule: [{ cron: '5 4 * * *' }],
      },
    },
  },
  {
    name: 'Publish Segment Files - Manual',
    inputs: ['checkout', 'setup_env', 'deploy_segment', 'publish_slack'],
    output: 'publish_segment-manual',
  },
  {
    name: 'Publish Fusetunnel',
    inputs: ['checkout', 'setup_env', 'publish_ft', 'publish_slack'],
    output: 'publish_fusetunnel',
  },
];

function buildSpec(name: string, inputs: string[], output: string, options: ISpec['options'] = {}) {
  // Used when custom runners are used. Currently we only need self-hosted runners when used for automated tests.
  const baseName: string = options.runner_type === 'self-hosted' ? LOCAL_BASE_YML : options.base || BASE_YML;
  const base: any = yaml.load(fs.readFileSync(`${INPUT_DIR}/${baseName}.yml`, 'utf8'));
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
