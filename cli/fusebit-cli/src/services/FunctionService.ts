import { Message, IExecuteInput, Confirm, MessageKind } from '@5qtrs/cli';
import { ExecuteService } from './ExecuteService';
import { ProfileService } from './ProfileService';
import { Text } from '@5qtrs/text';
import { readFile } from '@5qtrs/file';

// ------------------
// Internal Constants
// ------------------

const notSet = Text.dim(Text.italic('<not set>'));

// -------------------
// Exported Interfaces
// -------------------

// ----------------
// Exported Classes
// ----------------

export class FunctionService {
  private input: IExecuteInput;
  private executeService: ExecuteService;
  private profileService: ProfileService;

  private constructor(profileService: ProfileService, executeService: ExecuteService, input: IExecuteInput) {
    this.input = input;
    this.profileService = profileService;
    this.executeService = executeService;
  }

  public static async create(input: IExecuteInput) {
    const executeService = await ExecuteService.create(input);
    const profileService = await ProfileService.create(input);
    return new FunctionService(profileService, executeService, input);
  }

  public async displayFunctions(functions: string[]) {
    if (this.input.options.format === 'json') {
      await this.input.io.writeLine(JSON.stringify(functions, null, 2));
      return;
    }

    if (!functions.length) {
      await this.executeService.info('No Functions', 'There are currently no functions that match the search criteria');
      return;
    }

    const boundaries: { [index: string]: string[] } = {};
    for (const functionPath of functions) {
      const [boundary, func] = functionPath.split('/');
      boundaries[boundary] = boundaries[boundary] || [];
      boundaries[boundary].push(func);
    }

    const message = await Message.create({
      header: Text.blue('Boundaries'),
      message: Text.blue('Functions'),
    });
    await message.write(this.input.io);

    for (const boundary in boundaries) {
      await this.writeBoundary(boundary, boundaries[boundary]);
    }
  }

  private async writeBoundary(boundaryName: string, functions: string[]) {
    const functionList = Text.join(functions, Text.dim(', '));
    this.executeService.message(Text.bold(boundaryName), functionList);
  }
}
