import * as childProcess from 'child_process';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as _ from 'lodash';

import { ApiError } from './errors';
import { availableValues, tmpDir, extensions } from './constants';

const exec = util.promisify(childProcess.exec);

const parameterPattern = /\s-([a-zA-Z])(?: ([A-Z:\[\]]+))?|--([a-z\-]+)([a-zA-Z=:\[\]|]+)?/g;

// https://pandoc.org/MANUAL.html

export interface CommandOptionDefine {
  type: 'boolean' | 'string' | 'enum' | 'meta';
  names: string[];
  defaultName: string;
  optionalValue: boolean;
  values: string[];
}

export type CommandOptionValue = string | true;

export type CommandOptionDefineMap = Map<string, CommandOptionDefine>;
export type CommandOptionsMap = Map<string, CommandOptionValue>;


export interface ICommandOptions {
  [key: string]: CommandOptionValue;
}

export class CommandOptions {

  private defines: CommandOptionDefineMap;
  private options: CommandOptionsMap;

  constructor(define: CommandOptionDefineMap) {
    this.defines = define;
    this.options = new Map();
  }

  set(key: string, _value: string) {
    if (!this.defines.has(key)) {
      throw new ApiError(400, 'invalid_option', `invalid option '${key}'`);
    }
    const define = this.defines.get(key);
    let value: CommandOptionValue = _value;
    switch (define.type) {
      case 'boolean':
        if (['yes', 'on', 'true', '1'].includes(value)) {
          value = true;
        } else if (['no', 'off', 'false', '0'].includes(value)) {
          return;
        } else {
          throw new ApiError(400, 'invalid_option', `invalid option of boolean type: ${key}=${_value}`);
        }
        break;
      case 'enum':
        if (!define.values.includes(value)) {
          throw new ApiError(400, 'invalid_option', `invalid option of enum type: ${key}=${_value}`);
        }
      case 'string':
      case 'meta':
        break;
    }
    this.options.set(define.defaultName, value);
  }

  get(key: string) {
    const define = this.defines.get(key);
    return this.options.get(define.defaultName);
  }

  has(key: string) {
    return this.options.has(key);
  }

  delete(key: string) {
    this.options.delete(key);
  }

  toArgs() {
    const args: string[] = [];
    for (const [key, value] of this.options.entries()) {
      const arg = `${key.length === 1 ? '-' : '--'}${key}`;
      if (_.isBoolean(value)) {
        args.push(arg);
      } else {
        args.push(`${arg}=${value}`);
      }
    }
    return args;
  }

  toString() {
    const args = this.toArgs();
    return args.join(' ');
  }

}

const EXEC_NAME = 'pandoc';

export class Converter {

  constructor() {
    this.init();
  }

  private helpText: string;
  private converterHelpText: string;
  private options: CommandOptionDefine[];
  private optionMap: Map<string, CommandOptionDefine>;
  private _ready: Promise<any>;

  init() {
    this._ready = exec(`${EXEC_NAME} --help`)
    .then((result) => {
      this.helpText = result.stdout;
      this.parseHelpInfo();
    });
  }

  ready() {
    return this._ready;
  }

  parseHelpInfo() {
    const lines = this.helpText.split('\n');
    const options: CommandOptionDefine[] = [];
    const help = [
      'pandoc-api, a RESTful wrapper for pandoc',
      '  please visit https://github.com/alphakevin/pandoc-api',
      '',
      'converting:',
      '  upload with multipart/form-data:',
      '    curl -F file=@example.docx http://127.0.0.1:4000/api/convert/from/docx/to/html > result.html',
      '  upload raw:',
      '    curl -X POST \\',
      '      -T "example.docx" \\',
      '      -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \\',
      '      -H "Content-Disposition: attachment; filename=\"example.docx\"" \\',
      '      http://127.0.0.1:4000/api/convert/from/docx/to/html > result.html',
      '',
      'converter options:',
      '',
    ];
    const optionMap: CommandOptionDefineMap = new Map();
    lines.forEach(line => {
      const matches = line.match(parameterPattern);
      if (!matches) {
        return;
      };
      const option: CommandOptionDefine = {
        type: 'boolean',
        names: [],
        values: [],
        defaultName: '',
        optionalValue: false,
      };
      matches.forEach(match => {
        parameterPattern.lastIndex = 0;
        const result = parameterPattern.exec(match);
        let [, short, shortValue, long, longValue] = result;
        if (short) {
          optionMap.set(short, option);
          option.names.push(short);
          if (option.defaultName.length === 0) {
            option.defaultName = short;
          }
          if (shortValue) {
            option.type = shortValue.includes(':') ? 'meta' : 'string';
          }
        } else {
          optionMap.set(long, option);
          option.names.push(long);
          if (option.defaultName.length <= 1) {
            option.defaultName = long;
          }
          if (longValue) {
            if (/^\[/.test(longValue)) {
              option.type = 'string';
              option.optionalValue = true;
            } else if (longValue.includes('|')) {
              option.values = longValue.slice(1).split('|');
              option.type = /^[a-z]$/.test(option.values[0]) ? 'enum' : 'string';
            }
          }
        }
      });
      const values = availableValues[option.defaultName];
      if (values) {
        option.type = 'enum';
        option.values = values;
      }
      options.push(option);
    });
    help.push('');
    this.converterHelpText = help.join('\n') + this.helpText;
    this.options = options;
    this.optionMap = optionMap;
  }

  parseUrlCommand(commands: string): CommandOptions {
    const list = commands.split('/');
    const options = new CommandOptions(this.optionMap);
    const pairs = _.chunk(list, 2);
    pairs.forEach(([key, value]) => {
      options.set(key, value);
    });
    return options;
  }

  getHelpText() {
    return this.converterHelpText;
  }

  getFormatExtension(format: string) {
    return extensions[format] || 'txt';
  }

  convert(inputFile: string, options: CommandOptions): Promise<string> {
    const extension = this.getFormatExtension(options.get('to') as string);
    const outputFile = `${tmpDir}/${path.parse(inputFile).name}.${extension}`;
    const args = options.toArgs();
    args.push(`--output=${outputFile}`);
    args.push(inputFile);
    console.log('inputFile = ', inputFile);
    console.log(`pandoc ${args.join(' ')}`);
    return new Promise((resolve, reject) => {
      const handler = childProcess.spawn('pandoc', args);
      const errors = [];
      handler.stderr.on('data', error => {
        errors.push(error);
      });
      handler.on('exit', () => {
        if (errors.length) {
          return reject(new Error(Buffer.concat(errors).toString('utf8')));
        }
        resolve(outputFile);
      });
    })
  }

}
