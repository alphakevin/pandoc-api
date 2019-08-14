import * as os from 'os';
import * as fs from 'fs';
import * as mime from 'mime-types';
import * as path from 'path';
import * as multer from 'multer';
import * as uuid from 'uuid';
import * as contentDisposition from 'content-disposition';

import { tmpDir } from './constants';
import { ApiError } from './errors';
import { RequestHandler } from 'express';

if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir);
}

export const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${uuid.v4()}${ext}`;
    cb(null, name);
  }
});

export const uploadRaw: () => RequestHandler = () => {
  return (req, res, next) => {
    const contentType = req.get('Content-Type');
    const contentDisp = req.get('Content-Disposition');
    if (contentType.indexOf('multipart/form-data') === 0) {
      next();
      return;
    }
    if (!contentType || !contentDisp) {
      throw new ApiError(400, 'invalid_header', 'Could not find Content-Type or Content-Disposition header');
    }
    const parsed = contentDisposition.parse(contentDisp);
    if (!parsed || !parsed.parameters || !parsed.parameters.filename) {
      throw new ApiError(400, 'invalid_header', 'invalid Content-Disposition header');
    }
    const { filename } = parsed.parameters;
    const ext = path.extname(filename);
    const newFilename = `${uuid.v4()}${ext}`;
    const filePath = `${tmpDir}/${newFilename}`
    const fileStream = fs.createWriteStream(filePath);
    fileStream.on('finish', () => {
      req.file = {
        originalname: filename,
        filename: newFilename,
        path: filePath,
        fieldname: 'file',
        size: 0,
        encoding: null,
        mimetype: mime.contentType(newFilename) || 'application/octet-stream',
        destination: null,
        location: null,
        buffer: null,
      };
      next();
    });
    req.pipe(fileStream);
  };
};
