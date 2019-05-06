import { Command, IExecuteInput, ArgType } from '@5qtrs/cli';
import { AccountService } from '../../services';

// ------------------
// Internal Constants
// ------------------

const command = {
  name: 'Add Account',
  cmd: 'add',
  summary: 'Add an account',
  description: 'Adds an account to the Fusebit platform with the given AWS account id.',
  arguments: [
    {
      name: 'name',
      description: 'The name of the account',
    },
    {
      name: 'id',
      description: 'The id of the AWS account to add',
    },
    {
      name: 'role',
      description: 'The role that needs to be assumed to access the AWS account',
    },
  ],
  options: [
    {
      name: 'confirm',
      aliases: ['c'],
      description: 'If set to true, prompts for confirmation before adding the account to the Fusebit platform',
      type: ArgType.boolean,
      default: 'true',
    },
  ],
};

// ----------------
// Exported Classes
// ----------------

export class AddAccountCommand extends Command {
  public static async create() {
    return new AddAccountCommand();
  }

  private constructor() {
    super(command);
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    await input.io.writeLine();
    const [name, id, role] = input.arguments as string[];
    const confirm = input.options.confirm as boolean;

    const accountService = await AccountService.create(input);

    const account = { name, id, role };
    await accountService.checkAccountExists(account);

    if (confirm) {
      await accountService.confirmAddAccount(account);
    }

    await accountService.addAccount(account);

    return 0;
  }
}
