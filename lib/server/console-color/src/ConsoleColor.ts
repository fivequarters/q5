// ------------------
// Internal Constants
// ------------------

const colors = {
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
};

// ------------------
// Internal Functions
// ------------------

function asColor(text: string, colorCode: number[]) {
  return `\u001b[${colorCode[0]}m${text}\u001b[${colorCode[1]}m`;
}

// --------------
// Exported Class
// --------------

export class ConsoleColor {

  public get enabled() {
    return this.enabledProp;
  }

  public static async create(enabled: boolean = true) {
    return new ConsoleColor(enabled);
  }
  private enabledProp: boolean;

  private constructor(enabled: boolean) {
    this.enabledProp = true;
  }

  public enable() {
    this.enabledProp = true;
  }

  public disable() {
    this.enabledProp = false;
  }

  public black(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.black);
  }

  public red(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.red);
  }

  public green(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.green);
  }

  public yellow(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.yellow);
  }

  public blue(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.blue);
  }

  public magenta(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.magenta);
  }

  public cyan(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.cyan);
  }

  public white(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.white);
  }

  public gray(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.gray);
  }

  public grey(text: string) {
    return this.gray(text);
  }

  public bold(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.bold);
  }

  public dim(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.dim);
  }

  public italic(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.italic);
  }

  public underline(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.underline);
  }

  public inverse(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.inverse);
  }

  public hidden(text: string) {
    if (!this.enabled) {
      return text;
    }
    return asColor(text, colors.hidden);
  }
}
