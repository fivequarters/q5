import Async from 'async';

import { ArgType, Command, IExecuteInput } from '@5qtrs/cli';

import { ExecuteService, FunctionService } from '../../../services';
import { IFusebitFunctionShort } from '../../../services/FunctionService';

import * as Constants from '@5qtrs/constants';

// ------------------
// Internal Constants
// ------------------

const PARALLEL_REBUILD_REQUESTS = 10;
const FUNCTION_LIST_CHUNK = 100;

const command = {
  name: 'Rebuild a Function',
  cmd: 'rebuild',
  summary: 'Rebuild a function',
  description: [
    'Forces a function, or functions matching the search criteria, to re-evaluate',
    'its dependencies, following semver rules in the package.json to perform',
    'upgrades to the latest acceptable version.',
  ].join(' '),
  arguments: [
    {
      name: 'function',
      description: 'The id of the function',
      required: false,
    },
  ],
  options: [
    {
      name: 'search',
      aliases: ['s'],
      description: [
        'Search for functions containing this function property. Search',
        'supports a single filtering criteria, in the form of `search=key` for any',
        'function posessing a key matching that value, or `--search key=value` for',
        'functions that specifically match a value.  If the key or value contains',
        'an `=`, encode them to the URI specification first.',
      ].join(' '),
      type: ArgType.string,
      allowMany: true,
    },
    {
      name: 'dry-run',
      aliases: ['n'],
      description: ['Report the functions that would be rebuilt, performing no actions'].join(' '),
      type: ArgType.boolean,
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class FunctionRebuildCommand extends Command {
  public static async create() {
    return new FunctionRebuildCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const functionId = input.arguments[0] as string;
    const search = (input.options.search as string[]) || [];
    const dryRun = input.options['dry-run'] as boolean;

    // Encourage displayFunctionUrl to be pretty.
    input.options.output = 'pretty';

    const functionService = await FunctionService.create(input);
    const executeService = await ExecuteService.create(input);

    await executeService.newLine();

    if (search.length === 0) {
      if (dryRun) {
        const url = await functionService.getFunctionUrl(functionId);
        await functionService.displayFunctionUrl(url);
        return 0;
      }

      const location = await functionService.deployFunction(undefined, functionId);
      await functionService.displayFunctionUrl(location);
      return 0;
    }

    let functions: IFusebitFunctionShort[] = [];
    let next: string | undefined;
    do {
      const result = await functionService.listFunctions({ search, next, count: FUNCTION_LIST_CHUNK });

      functions = functions.concat(result.items);

      next = result.next;
      if (next && functions.length % (FUNCTION_LIST_CHUNK * 5) === 0) {
        await executeService.message('Loading...', `${functions.length} found...`);
      }
    } while (next);

    if (functions.length === 0) {
      await executeService.message('Done', `No functions found that match that criteria`);
      return 0;
    }

    await executeService.message('Functions Found', `${functions.length} functions match criteria`);

    if (dryRun) {
      await functionService.displayFunctions(functions, true);
      return 0;
    }

    // Get the execution profile once, since it matches all of the functions.
    input.options.boundary = functions[0].boundaryId;
    const profile = await functionService.getFunctionExecutionProfile(true, functions[0].functionId);

    // Encourage deployFunctionEx to be quiet.
    input.options.output = 'quiet';

    let numComplete = 0;
    await Constants.asyncPool(PARALLEL_REBUILD_REQUESTS, functions, async (f: IFusebitFunctionShort) => {
      await functionService.deployFunctionEx({
        baseUrl: profile.baseUrl,
        account: profile.account,
        subscription: profile.subscription as string,
        boundary: f.boundaryId,
        function: f.functionId,
        accessToken: profile.accessToken,
      });
      numComplete++;
      if (numComplete % PARALLEL_REBUILD_REQUESTS === 0) {
        input.options.output = 'pretty';
        await executeService.message('Progress', `${numComplete}/${functions.length} complete`);
        input.options.output = 'quiet';
      }
    });

    input.options.output = 'pretty';
    await executeService.message('Done', `${functions.length} functions rebuilt`);
    return 0;
  }
}
