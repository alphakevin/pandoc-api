import * as os from 'os';
import * as path from 'path';
import * as express from 'express';
import * as mime from 'mime-types';
import * as multer from 'multer';
import * as uuid from 'uuid';
import { wrap } from 'async-middleware';
import * as contentDisposition from 'content-disposition';
import { Converter } from './converter';
import { ApiError, errorHandler } from './errors';
import { storage, uploadRaw } from './storage';

const packageJson = require('../package.json');

export function createApp() {
  const app = express();
  const converter = new Converter();
  const upload = multer({
    storage: storage,
  });
  
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    res.set('X-Powered-By', `${packageJson.name}@${packageJson.version}`)
    next();
  });

  app.get('/', (req, res, next) => {
    res.redirect('/api');
  });
  
  app.get('/api/help', (req, res, next) => {
    res.set('Content-Type', 'text/plain');
    res.send(converter.getHelpText());
  });

  app.post('/api/convert/:command(*)',
   uploadRaw(),
   upload.single('file'),
   wrap(async (req, res, next) => {
      const { file } = req;
      if (!file) {
        throw new ApiError(400, 'cannot find input file');
      }
      const { command } = req.params;
      const options = converter.parseUrlCommand(command);
      const outputFile = await converter.convert(file.path, options);
      const extname = path.extname(outputFile);
      const basename = path.basename(file.originalname);
      const filename = `${basename}${extname}`;
      res.set('Content-Disposition', contentDisposition(filename));
      res.sendFile(outputFile);
    })
  );

  app.use('*', (req, res, next) => {
    throw new ApiError(404, 'route_not_found', 'the requested path does not exist');
  });

  app.use(errorHandler);
  
  return app;
}
