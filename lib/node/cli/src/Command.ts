import { startsWith } from '@5qtrs/array';
import { IText, Text } from '@5qtrs/text';
import { ArgType } from './ArgType';
import { Argument, IArgument } from './Argument';
import { ICommandIO } from './CommandIO';
import { Help } from './Help';
import { Message, MessageKind } from './Message';
import { IOption, Option } from './Option';
import { ParsedArgs } from './ParsedArgs';

// ------------------
// Internal Constants
// ------------------

const hypenChar = '-';
const booleanTrueStrings = ['true', 'on', 'yes', '1', 't', 'y'];
const booleanFalseStrings = ['false', 'off', 'no', '0', 'f', 'n'];

// ------------------
// Internal Functions
// ------------------

function addHypensToSwitch(optionName: string) {
  return `${hypenChar}${optionName.length > 1 ? hypenChar : ''}${optionName}`;
}

function getHelpCommand(cli?: string, terms?: string[]) {
  const helpCommand = ['--help'];
  if (terms && terms.length) {
    const termsCommand = terms.join(' ');
    if (termsCommand) {
      helpCommand.unshift(termsCommand);
    }
  }
  if (cli && cli.length) {
    helpCommand.unshift(cli);
  }

  return helpCommand.join(' ');
}

function parseArgType(value: string, type: ArgType) {
  if (type === ArgType.boolean) {
    return toBoolean(value);
  } else if (type === ArgType.integer) {
    const parsed = parseInt(value || '', 10);
    return isNaN(parsed) ? undefined : parsed;
  } else if (type === ArgType.float) {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  return value;
}

function toBoolean(value?: string) {
  if (!value) {
    return true;
  }

  const asLowerCase = value.toLowerCase();
  if (booleanTrueStrings.indexOf(asLowerCase) >= 0) {
    return true;
  } else if (booleanFalseStrings.indexOf(asLowerCase) >= 0) {
    return false;
  }

  return undefined;
}

function getMatchingOption(command: Command, option: string) {
  for (const allowedOption of command.options) {
    let optionMatch = addHypensToSwitch(allowedOption.name) === option;
    if (!optionMatch) {
      for (const alias of allowedOption.aliases) {
        if (addHypensToSwitch(alias) === option) {
          optionMatch = true;
          break;
        }
      }
    }

    if (optionMatch) {
      return allowedOption;
    }
  }
  return undefined;
}

function ensureText(text?: IText): Text {
  if (text === undefined) {
    return Text.empty();
  }
  return text instanceof Text ? text : Text.create(text || '');
}

function ensureArray<T>(items?: T[]): T[] {
  return items === undefined ? [] : items;
}

function ensureOptions(options?: IOption[]): Option[] {
  const result = [];
  if (options !== undefined) {
    for (const option of options) {
      result.push(option instanceof Option ? option : new Option(option));
    }
  }
  return result;
}

function ensureArguments(allArguments?: IArgument[]): Argument[] {
  const result = [];
  if (allArguments !== undefined) {
    for (const argument of allArguments) {
      result.push(argument instanceof Argument ? argument : new Argument(argument));
    }
  }
  return result;
}

function ensureSubCommands(commands?: ICommand[]): Command[] {
  const result = [];
  if (commands !== undefined) {
    for (const command of commands) {
      result.push(command instanceof Command ? command : new Command(command));
    }
  }
  return result;
}

// -------------------
// Exported Interfaces
// -------------------

export interface ICommand {
  name: string;
  cmd?: string;
  usage?: IText;
  description?: IText;
  summary?: IText;
  options?: IOption[];
  ignoreOptions?: string[];
  arguments?: IArgument[];
  acceptsUnknownOptions?: boolean;
  acceptsUnknownArguments?: boolean;
  modes?: string[];
  subCommands?: ICommand[];
  delegate?: boolean;
  docsUrl?: string;
  cli?: string;
  skipBuiltInProfile?: boolean;
}

export interface IOptionsSet {
  [index: string]: string | number | boolean | (string | number | boolean)[];
}

export interface IExecuteInput {
  terms: string[];
  arguments: (string | number | boolean | undefined)[];
  options: IOptionsSet;
  mode?: string;
  io: ICommandIO;
}

// ----------------
// Exported Classes
// ----------------

export class Command implements ICommand {
  private nameProp: string;
  private cmdProp: string;
  private usageProp: Text;
  private descriptionProp: Text;
  private summaryProp: Text;
  private optionsProp: Option[];
  private ignoreOptionsProp: string[];
  private argumentsProp: Argument[];
  private acceptsUnknownOptionsProp?: boolean;
  private acceptsUnknownArgumentsProp?: boolean;
  private subCommandsProp: Command[];
  private delegateProp: boolean;
  private modesProp: string[];
  private docsUrlProp: string;
  private cliProp: string;
  public parent?: Command;
  public skipBuiltInProfile?: boolean;

  public constructor(command: ICommand) {
    this.nameProp = command.name;
    this.cmdProp = command.cmd || '';
    this.usageProp = ensureText(command.usage);
    this.descriptionProp = ensureText(command.description);
    this.summaryProp = ensureText(command.summary);
    this.optionsProp = ensureOptions(command.options);
    this.argumentsProp = ensureArguments(command.arguments);
    this.acceptsUnknownOptionsProp = command.acceptsUnknownOptions;
    this.acceptsUnknownArgumentsProp = command.acceptsUnknownArguments;
    this.modesProp = ensureArray(command.modes);
    this.subCommandsProp = ensureSubCommands(command.subCommands);
    this.delegateProp = command.delegate || false;
    this.docsUrlProp = command.docsUrl || '';
    this.cliProp = command.cli || '';
    this.ignoreOptionsProp = command.ignoreOptions || [];
    for (const subCommand of this.subCommands) {
      subCommand.parent = this;
    }
    this.skipBuiltInProfile = command.skipBuiltInProfile || false;
  }

  public async execute(args: string[], io: ICommandIO): Promise<number> {
    const parsedArgs = ParsedArgs.create(args);
    const command = await this.getCommandToExecute(parsedArgs, io);

    if (command) {
      const displayHelp =
        (command.subCommands.length > 0 && command.delegateProp === false) ||
        parsedArgs.options['--help'] !== undefined ||
        parsedArgs.options['-h'] !== undefined ||
        parsedArgs.options['-H'] !== undefined;
      if (displayHelp) {
        await command.onHelp(io);
        return 0;
      }

      let result = 1;

      if (command.delegateProp) {
        try {
          result = await command.execute(args, io);
        } catch (error) {
          result = 1;
        }
        return result;
      }

      const input = await this.getExecuteInput(command, parsedArgs, io);
      if (input) {
        result = await this.onSubCommandExecuting(command, input);
        if (result !== 0) {
          return result;
        }

        try {
          result = await command.onExecute(input);
        } catch (error) {
          result = await this.onSubCommandError(command, input, error);
        }
        await this.onSubCommandExecuted(command, input, result);
        return result;
      }
    }

    return 1;
  }

  protected async onSubCommandExecuting(command: Command, input: IExecuteInput): Promise<number> {
    return 0;
  }

  protected async onSubCommandExecuted(command: Command, input: IExecuteInput, result: number) {
    return;
  }

  protected async onSubCommandError(command: Command, input: IExecuteInput, error: Error) {
    return 1;
  }

  protected async getCommandToExecute(parsedArgs: ParsedArgs, io: ICommandIO) {
    const mode = await this.onGetMode(parsedArgs, io);
    let commands = await this.getPotentialCommandsToExecute(parsedArgs, mode);

    if (commands.length > 1) {
      commands = await this.onMulitplePotentialCommands(parsedArgs, commands, io);
      if (commands.length > 1) {
        return undefined;
      }
    }

    if (commands.length === 0) {
      if (
        startsWith(parsedArgs.termsAndArguments, this.terms) &&
        parsedArgs.termsAndArguments.length <= this.terms.length + this.arguments.length
      ) {
        commands.push(this);
      }
    }

    if (commands.length === 0) {
      commands = await this.onNoPotentialCommands(parsedArgs, io);
      if (commands.length !== 1) {
        return undefined;
      }
    }

    return commands[0];
  }

  protected async getPotentialCommandsToExecute(parsedArgs: ParsedArgs, mode?: string) {
    const potentialCommands: Command[] = [];
    for (const command of this.allSubCommands) {
      if (startsWith(parsedArgs.termsAndArguments, command.terms)) {
        potentialCommands.push(command);
      }
    }

    if (potentialCommands.length > 1) {
      let maxTerms = 0;
      for (const command of potentialCommands) {
        if (command.terms.length > maxTerms) {
          maxTerms = command.terms.length;
        }
      }
      for (let i = 0; i < potentialCommands.length; i++) {
        if (potentialCommands[i].terms.length < maxTerms) {
          potentialCommands.splice(i, 1);
          i--;
        }
      }
    }
    return potentialCommands;
  }

  protected async onMulitplePotentialCommands(parsedArgs: ParsedArgs, commands: Command[], io: ICommandIO) {
    const helpCommand = this.cli ? Text.create("'", Text.boldItalic(this.cli), "' ") : '';
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Mulitple Commands',
      message: Text.create(
        "The command '",
        Text.boldItalic(parsedArgs.termsAndArguments.join(' ')),
        "' can be interpreted as multiple commands. This may be because of ",
        ' installed extensions that conflict.',
        Text.eol(),
        Text.eol(),
        'Enquire with the creator of the ',
        helpCommand,
        'CLI for a possible solution.'
      ),
    });
    message.write(io);
    return commands;
  }

  protected async onNoPotentialCommands(parsedArgs: ParsedArgs, io: ICommandIO): Promise<Command[]> {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Unknown Command',
      message: Text.create(
        "The command '",
        Text.boldItalic(parsedArgs.termsAndArguments.join(' ')),
        "' does not match any available commands.",
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli)),
        "' to see a list of available commands."
      ),
    });
    message.write(io);
    return [];
  }

  protected async onUnknownOption(parsedArgs: ParsedArgs, command: Command, option: string, io: ICommandIO) {
    const commandTerms = command.terms.join(' ');
    const commandName = commandTerms ? Text.create("'", Text.boldItalic(commandTerms), "' ") : Text.empty();
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Unknown Option',
      message: Text.create(
        "The option '",
        Text.boldItalic(option),
        "' does not match any available options of the ",
        commandName,
        'command.',
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see a list of available command options."
      ),
    });
    message.write(io);
  }

  protected async onInvalidOptionType(parsedArgs: ParsedArgs, command: Command, option: Option, io: ICommandIO) {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Invalid Option',
      message: Text.create(
        "The option '",
        Text.boldItalic(option.name),
        `' could not be parsed as ${option.type === ArgType.integer ? 'an' : 'a'} ${option.type}.`,
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see description of the '",
        Text.boldItalic(option.name),
        "' command option."
      ),
    });
    message.write(io);
  }

  protected async onUnknownArguments(parsedArgs: ParsedArgs, command: Command, args: string[], io: ICommandIO) {
    const commandTerms = command.terms.join(' ');
    const commandName = commandTerms ? Text.create("'", Text.boldItalic(commandTerms), "' ") : Text.empty();
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Unknown Argument',
      message: Text.create(
        `The argument value${args.length > 1 ? 's' : ''} '`,
        Text.boldItalic(args.join(' ')),
        `' do${args.length > 1 ? '' : 'es'} not match the expected arguments of the `,
        commandName,
        ' command.',
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see a list of expected command arguments."
      ),
    });
    message.write(io);
  }

  protected async onMissingArgument(parsedArgs: ParsedArgs, command: Command, argument: string, io: ICommandIO) {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Missing Argument',
      message: Text.create(
        "The required argument '",
        Text.boldItalic(argument),
        `' was not specified.`,
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see a description of the required command arguments."
      ),
    });
    message.write(io);
  }

  protected async onInvalidArgumentType(parsedArgs: ParsedArgs, command: Command, argument: Argument, io: ICommandIO) {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Invalid Argument',
      message: Text.create(
        "The argument '",
        Text.boldItalic(argument.name),
        `' could not be parsed as ${argument.type === ArgType.integer ? 'an' : 'a'} ${argument.type}.`,
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see description of the '",
        Text.boldItalic(argument.name),
        "' command arguments."
      ),
    });
    message.write(io);
  }

  protected async onMultipleOptionValues(parsedArgs: ParsedArgs, command: Command, option: Option, io: ICommandIO) {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'Multiple Options',
      message: Text.create(
        "Multiple option values were provided for the option '",
        Text.boldItalic(option.name),
        `' but only one value is supported.`,
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see a description of the '",
        Text.boldItalic(option.name),
        "' command option."
      ),
    });
    message.write(io);
  }

  protected async onNoOptionValues(parsedArgs: ParsedArgs, command: Command, option: Option, io: ICommandIO) {
    io.writeLine();
    const message = await Message.create({
      kind: MessageKind.error,
      header: 'No Option Value',
      message: Text.create(
        "No option value was provided for the option '",
        Text.boldItalic(option.name),
        `'.`,
        Text.eol(),
        Text.eol(),
        "Execute '",
        Text.boldItalic(getHelpCommand(this.cli, command.terms)),
        "' to see a description of the '",
        Text.boldItalic(option.name),
        "' command option."
      ),
    });
    message.write(io);
  }

  protected async getExecuteInput(command: Command, parsedArgs: ParsedArgs, io: ICommandIO) {
    const executeArguments = parsedArgs.termsAndArguments.slice(command.terms.length);
    const options: IOptionsSet = {};
    const argsAsOptions = [];

    if (!command.acceptsUnknownArgumentsProp && executeArguments.length > command.arguments.length) {
      const unknownArguments = executeArguments.slice(command.arguments.length);
      await this.onUnknownArguments(parsedArgs, command, unknownArguments, io);
      return undefined;
    }

    for (let i = 0; i < command.arguments.length; i++) {
      const argument = command.arguments[i];
      const argumentName = argument.name;
      const argumentNameWithHypens = addHypensToSwitch(argumentName);
      const argumentOption = parsedArgs.options[argumentNameWithHypens];
      let value = argumentOption ? argumentOption[0] : undefined;
      if (value) {
        argsAsOptions.push(argumentNameWithHypens);
        executeArguments.splice(i, 0, value);
      } else {
        value = executeArguments[i];
      }
      if (value === undefined) {
        if (argument.required) {
          if (executeArguments.length === 0) {
            await command.onHelp(io);
            return 0;
          } else {
            await this.onMissingArgument(parsedArgs, command, argumentName, io);
            return undefined;
          }
        }
        value = argument.type === ArgType.boolean ? 'true' : argument.default;
      }
      if (value !== undefined) {
        value = parseArgType(value as string, argument.type);
        if (value === undefined) {
          await this.onInvalidArgumentType(parsedArgs, command, argument, io);
          return undefined;
        }
      }
      executeArguments[i] = value;
    }

    for (const option in parsedArgs.options) {
      if (option && !(argsAsOptions.indexOf(option) >= 0)) {
        const matchedOption = getMatchingOption(command, option);

        if (!command.acceptsUnknownOptionsProp && !matchedOption) {
          await this.onUnknownOption(parsedArgs, command, option, io);
          return undefined;
        }

        const optionValues = parsedArgs.options[option];
        if (matchedOption && !matchedOption.allowMany && optionValues.length > 1) {
          await this.onMultipleOptionValues(parsedArgs, command, matchedOption, io);
          return undefined;
        }

        const parsedValues = [];
        const values = parsedArgs.options[option];
        if (!values.length) {
          if (matchedOption && matchedOption.type === ArgType.boolean) {
            values.push('true');
          } else if (matchedOption && matchedOption.type === ArgType.string) {
            values.push('');
          }
        }

        if (matchedOption && !values.length) {
          await this.onNoOptionValues(parsedArgs, command, matchedOption, io);
          return undefined;
        }

        for (const value of values) {
          const parsed = matchedOption ? parseArgType(value, matchedOption.type) : value;
          if (matchedOption && parsed === undefined) {
            await this.onInvalidOptionType(parsedArgs, command, matchedOption, io);
            return undefined;
          }
          parsedValues.push(parsed);
        }
        options[matchedOption?.name || option] =
          !matchedOption || matchedOption.allowMany ? parsedValues : parsedValues[0];
      }
    }

    for (const option of command.options) {
      if (option.default !== undefined && options[option.name] === undefined) {
        const parsed = parseArgType(option.default, option.type);
        if (parsed === undefined) {
          await this.onInvalidOptionType(parsedArgs, command, option, io);
          return undefined;
        }
        options[option.name] = parsed;
      }
    }
    options.verbose = options.verbose || !!process.env.FUSEBIT_DEBUG;

    const input: IExecuteInput = {
      terms: command.terms,
      arguments: executeArguments,
      options,
      io,
    };

    return input;
  }

  protected async onExecute(input: IExecuteInput): Promise<number> {
    const message = await Message.create({
      kind: MessageKind.warning,
      header: 'Not Implemented:',
      message: 'The Command is not currently implemented',
    });
    message.write(input.io);
    return new Promise((resolve) => setImmediate(() => resolve(1)));
  }

  protected async onExecuteRaw(args: string[], io: ICommandIO): Promise<number> {
    const message = await Message.create({
      kind: MessageKind.warning,
      header: 'Not Implemented:',
      message: 'The Command is not currently implemented',
    });
    message.write(io);
    return 1;
  }

  protected async onGetMode(parsedArgs: ParsedArgs, io: ICommandIO): Promise<string | undefined> {
    return undefined;
  }

  protected async onHelp(io: ICommandIO) {
    const help = new Help(this);
    await help.write(io);
  }

  public get name() {
    return this.nameProp;
  }

  public get cmd() {
    return this.cmdProp;
  }

  public get usage() {
    return this.usageProp;
  }

  public get terms() {
    const terms: string[] = [];
    if (this.parent) {
      terms.push(...this.parent.terms);
    }
    if (this.cmdProp) {
      terms.push(this.cmdProp);
    }
    return terms;
  }

  public get description() {
    return this.descriptionProp;
  }

  public get summary() {
    return this.summaryProp;
  }

  public get options() {
    const options: Option[] = [];
    if (this.parent) {
      for (const option of this.parent.options) {
        if (this.ignoreOptions.indexOf(option.name) === -1) {
          options.push(option);
        }
      }
    }
    options.push(...this.optionsProp);
    return options;
  }

  public get ignoreOptions() {
    return this.ignoreOptionsProp.slice();
  }

  public get arguments() {
    const allArguments: Argument[] = [];
    if (this.parent) {
      allArguments.push(...this.parent.arguments);
    }
    allArguments.push(...this.argumentsProp);
    return allArguments;
  }

  public get modes(): string[] {
    if (this.modesProp.length) {
      return this.modesProp.slice();
    }
    if (this.parent) {
      return this.parent.modes;
    }
    return [];
  }

  public get subCommands() {
    return this.subCommandsProp.slice();
  }

  public get allSubCommands() {
    const allSubCommands: Command[] = [];
    for (const subCommand of this.subCommands) {
      allSubCommands.push(subCommand);
      allSubCommands.push(...subCommand.allSubCommands);
    }
    return allSubCommands;
  }

  public get docsUrl(): string {
    if (this.docsUrlProp.length) {
      return this.docsUrlProp;
    }
    if (this.parent) {
      return this.parent.docsUrl;
    }
    return '';
  }

  public get cli(): string {
    if (this.cliProp.length) {
      return this.cliProp;
    }
    if (this.parent) {
      return this.parent.cli;
    }
    return '';
  }
}
