import { createApp } from './app';
import { Converter } from './converter';
const packageJson = require('../package.json');
const productName = packageJson.name;

const argv = [...process.argv].slice(2);

function startServer(port?: string, hostname?: string) {
  if (port && port.indexOf(':') >= 0) {
    const arr = port.split(':');
    port = arr[1];
    hostname = arr[0];
  }
  const _port = parseInt(port || process.env.PORT) || 4000;
  hostname = hostname || process.env.HOSTNAME || 'localhost';
  const app = createApp();
  app.listen(_port, hostname, () => {
    console.log(`# ${productName} started on http://${hostname}:${_port}`);
  });
}

if (require.main === module) {
  const command = argv.shift();
  const converter = new Converter();
  switch (command) {
    case undefined:
    case 'help':
      const second = argv.shift();
      if (second === 'converter') {
        converter.ready()
        .then(() => {
          console.log(converter.getHelpText());
        });
        break;
      }
    case '--help':
    case '-h':
      const helpText = [
        `${productName}, a simple RESTful server for converting documents`,
        `  please visit https://github.com/alphakevin/${productName}`,
        '',
        `usage: ${productName} <command> <options>`,
        '',
        'commands:',
        '  start [<hostname>[:<port>]]  start the server, default to localhost:4000',
        '  help converter             get converter help',
        '',
        'options:',
        '  -h, --help                 print this help message',
      ];
      console.log(helpText.join('\n'));
      break;
    case 'start':
      startServer(...argv);
      break;
    default:
      console.error('Invalid command');
  }
  
}

export {
  Converter,
  startServer,
  createApp,
};
export default createApp;
module.exports = createApp;
