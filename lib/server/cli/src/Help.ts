import { CellAlignment, Table } from '@5qtrs/table';
import { IText, Text } from '@5qtrs/text';
import { ArgType } from './ArgType';
import { IArgument } from './Argument';
import { Command } from './Command';
import { ICommandIO } from './CommandIO';
import { IOption } from './Option';

// ------------------
// Internal Constants
// ------------------

const emptyCell = '';
const emptyRow = [emptyCell, emptyCell, emptyCell];
const defaultConsoleWidth = 80;
const commandsHeader = 'Commands:';
const commandArgument = 'command';
const usageHeader = 'Usage:';
const descriptionHeader = 'Description:';
const argumentsHeader = 'Arguments:';
const optionsHeader = 'Options:';
const propertyOpenChar = '[';
const propertyCloseChar = ']';
const propertyDelimiter = ' ';
const optionSwitchDelimiter = ' ';
const typePropertyName = '';
const hypenChar = '-';
const defaultPropertyName = 'default';
const requiredPropertyName = 'required';
const optionalPropertyName = 'optional';
const manyAllowedPropertyName = 'multi-valued';
const propertyNameValueDelimiter = ': ';
const argumentsAddtionalHelpText = "• Arguments may also be set via flags by prefixing the argument name with '--'.";
const docsUrlReplaceText = '<DOCS_URL>';
const docsAdditionalHelpText = `• Visit ${docsUrlReplaceText} for general documentation.`;

const alignRightCellConstraint = { align: CellAlignment.right };
const emptyCellConstraint = {};
const headerRowConstraint = { cells: [emptyCellConstraint, alignRightCellConstraint] };
const descriptionRowConstraint = { cells: [emptyCellConstraint, alignRightCellConstraint] };
const propertiesRowConstraint = { cells: [emptyCellConstraint, emptyCellConstraint, alignRightCellConstraint] };

// ------------------
// Internal Functions
// ------------------

function addProperty(properties: string[], name: string, value: string) {
  const delimiter = name && value ? propertyNameValueDelimiter : '';
  const property = `${name}${delimiter}${value}`;
  properties.push(`${propertyOpenChar}${property}${propertyCloseChar}`);
}

function addHypensToSwitch(optionName: IText) {
  return Text.create(hypenChar, optionName.length > 1 ? hypenChar : '', optionName);
}

// ----------------
// Exported Classes
// ----------------

export class Help {
  private command: Command;

  public constructor(command: Command) {
    this.command = command;
  }

  public async write(io: ICommandIO): Promise<void> {
    const outputWidth = io.outputWidth || defaultConsoleWidth;
    const table = await this.getHelpTable(outputWidth);
    await this.addUsage(table);
    await this.addDescription(table);
    await this.addArguments(table);
    await this.addOptions(table);
    await this.addCommands(table);

    const notesTable = await this.getNotesTable(outputWidth);
    await this.addNotes(notesTable);
    io.writeLine();

    const tableText = table.toText();
    if (tableText.length) {
      io.writeLine(tableText);
    }

    const notesTableText = notesTable.toText();
    if (notesTableText.length) {
      io.writeLine(notesTableText);
      io.writeLine();
    }
  }

  protected async formatHeader(text: IText) {
    return Text.yellow(text);
  }

  protected async addUsage(table: Table) {
    const usage = await this.getUsage();
    if (usage) {
      const header = await this.formatHeader(usageHeader);
      table.setRowConstraint(headerRowConstraint);
      table.addRow([emptyCell, header, usage]);
      table.addRow(emptyRow);
    }
  }

  protected async getUsage() {
    let usage = this.command.usage;
    if (!usage.length) {
      const names = [];
      for (const argument of this.command.arguments) {
        names.push(argument.name);
      }
      if (this.command.subCommands.length) {
        names.push(commandArgument);
      }

      const terms: IText[] = [];
      if (this.command.cli) {
        terms.push(this.command.cli);
      }
      if (this.command.terms.length) {
        terms.push(...this.command.terms);
      }
      for (const name of names) {
        terms.push(Text.boldItalic(`<${name}>`));
      }

      usage = Text.join(terms, ' ');
    }
    return usage;
  }

  protected async addDescription(table: Table) {
    const description = this.command.description || '';
    if (description) {
      const header = await this.formatHeader(descriptionHeader);
      table.setRowConstraint(headerRowConstraint);
      table.addRow([emptyCell, header, description]);
      table.addRow(emptyRow);
    }
  }

  protected async addCommands(table: Table) {
    if (this.command.subCommands.length > 0) {
      const header = await this.formatHeader(commandsHeader);
      table.setRowConstraint(headerRowConstraint);
      table.addRow([emptyCell, header, emptyCell]);
      table.addRow(emptyRow);

      for (const subCommand of this.command.subCommands) {
        const summary = subCommand.summary;
        const cmd = Text.boldItalic(subCommand.cmd);
        table.addRow([emptyCell, cmd, summary]);
        table.addRow(emptyRow);
      }
    }
  }

  protected async getArgumentProperties(argument: IArgument) {
    const properties: string[] = [];
    addProperty(properties, argument.required === false ? optionalPropertyName : requiredPropertyName, '');
    if (argument.type !== undefined && argument.type !== ArgType.string) {
      addProperty(properties, typePropertyName, argument.type);
    }

    return Text.dim(properties.join(propertyDelimiter));
  }

  protected async addArguments(table: Table) {
    if (this.command.arguments.length > 0) {
      const header = await this.formatHeader(argumentsHeader);
      table.setRowConstraint(headerRowConstraint);
      table.addRow([emptyCell, header, emptyCell]);
      table.addRow(emptyRow);

      for (const argument of this.command.arguments) {
        table.setRowConstraint(descriptionRowConstraint);
        const description = argument.description;
        const argumentName = Text.boldItalic(argument.name);
        table.addRow([emptyCell, argumentName, description]);

        table.setRowConstraint(propertiesRowConstraint);
        const properties = await this.getArgumentProperties(argument);
        if (properties) {
          table.addRow([emptyCell, emptyCell, properties]);
        }
        table.addRow(emptyRow);
      }
    }
  }

  protected async getOptionSwitches(option: IOption) {
    const switches = [addHypensToSwitch(Text.bold(option.name))];
    if (option.aliases && option.aliases.length) {
      for (const alias of option.aliases) {
        switches.push(addHypensToSwitch(alias));
      }
    }
    return Text.join(switches, optionSwitchDelimiter);
  }

  protected async getOptionProperties(option: IOption) {
    const properties: string[] = [];
    if (option.type !== undefined && option.type !== ArgType.string) {
      addProperty(properties, typePropertyName, option.type);
    }
    if (option.default !== undefined) {
      addProperty(properties, defaultPropertyName, option.default);
    }
    if (option.allowMany === true) {
      addProperty(properties, manyAllowedPropertyName, '');
    }

    return Text.dim(properties.join(propertyDelimiter));
  }

  protected async addOptions(table: Table) {
    if (this.command.options.length > 0) {
      const header = await this.formatHeader(optionsHeader);
      table.setRowConstraint(headerRowConstraint);
      table.addRow([emptyCell, header, emptyCell]);
      table.addRow(emptyRow);

      for (const option of this.command.options) {
        table.setRowConstraint(descriptionRowConstraint);
        const description = option.description;
        const optionSwitches = await this.getOptionSwitches(option);
        table.addRow([emptyCell, optionSwitches, description]);

        table.setRowConstraint(propertiesRowConstraint);
        const properties = await this.getOptionProperties(option);
        if (properties) {
          table.addRow([emptyCell, emptyCell, properties]);
        }
        table.addRow(emptyRow);
      }
    }
  }

  protected async addNotes(table: Table) {
    if (this.command.arguments.length) {
      table.addRow([emptyCell, Text.dim(argumentsAddtionalHelpText).italic()]);
    }
    if (this.command.docsUrl) {
      const docsText = docsAdditionalHelpText.replace(docsUrlReplaceText, this.command.docsUrl);
      table.addRow([emptyCell, Text.dim(docsText).italic()]);
    }
  }

  protected async getHelpTable(consoleWidth: number): Promise<Table> {
    return Table.create({
      width: consoleWidth,
      count: 3,
      gutter: 3,
      columns: [{ min: 0, max: 0 }, { flexShrink: 0, flexGrow: 0 }, { flexShrink: 1, flexGrow: 1 }],
    });
  }

  protected async getNotesTable(consoleWidth: number): Promise<Table> {
    return Table.create({
      width: consoleWidth,
      count: 2,
      gutter: 1,
      columns: [{ min: 0, max: 0 }, { flexShrink: 0, flexGrow: 0 }],
    });
  }
}
