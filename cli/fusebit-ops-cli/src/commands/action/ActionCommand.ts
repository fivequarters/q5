import { Command, ICommand } from '@5qtrs/cli';
import { RegenerateTagsActionCommand } from './RegenerateTagsActionCommand';
import { ClearTagsActionCommand } from './ClearTagsActionCommand';
import { MigrateStorageActionCommand } from './MigrateStorageActionCommand';
import { PopulateGrafanaDefaultsCommand } from './PopulateGrafanaDefaultsCommand';

// ------------------
// Internal Constants
// ------------------

const commands: ICommand = {
  name: 'Actions',
  cmd: 'action',
  summary: 'Execute scripted actions',
  description: 'Execute scripted actions supplied by Fusebit.',
};

// ----------------
// Exported Classes
// ----------------

export class ActionCommand extends Command {
  public static async create() {
    const subCommands = [];
    subCommands.push(await RegenerateTagsActionCommand.create());
    subCommands.push(await ClearTagsActionCommand.create());
    subCommands.push(await MigrateStorageActionCommand.create());
    subCommands.push(await PopulateGrafanaDefaultsCommand.create());
    commands.subCommands = subCommands;
    return new ActionCommand(commands);
  }

  private constructor(command: ICommand) {
    super(command);
  }
}
