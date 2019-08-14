# Pandoc API

A simple RESTful server for converting documents using [pandoc](https://pandoc.org/)

## Install

[pandoc](https://pandoc.org/) is required for converting documents

```shell
# apt-get install pandoc
yarn add pandoc-api
```

## Usage

Start a server in command-line:

```shell
yarn start
```

Get command line help

```shell
yarn --help
```

```shell
pandoc-api, a simple RESTful server for converting documents
  please visit https://github.com/alphakevin/pandoc-api

usage: pandoc-api <command> <options>

commands:
  start [<hostname>[:<port>]]  start the server, default to localhost:4000
  help converter             get converter help

options:
  -h, --help                 print this help message
```

Use in your application

```javascript
import expores from 'express';
import pandoc from 'pandoc-api';

const app = express();
app.use('/pandoc', pandoc());
// ... your own express routes
app.listen(3000);
```

## Converter

The server provides a similar interface like pandoc, you can simply remove `--` or `-` and use `/`
instead of white-space between the arguments, all after `/api/convert`.

```http
POST /api/convert/from/<input-format>/to/<output-format> HTTP/1.1
```

You can upload file by either of the following method:

* `multipart/form-data` upload with a `file` field of the file to be converted.
* RAW upload a file in HTTP body with `Content-Type` and `Content-Disposition` header provided.

If the `/output/<value>` option is provided, the `Content-Disposition` header will contain the new filename.

The converted document will be directly output from the HTTP response body.

For more converting options, please visit [https://pandoc.org/MANUAL.html](https://pandoc.org/MANUAL.html#options)

## Environment Variables

| Name       | Description                   |
| ---------- | ----------------------------- |
| `HOSTNAME` | For server listening hostname |
| `PORT`     | For server listening port     |

## Examples

Visit `http://127.0.0.1:4000/help`, or get help in command-line:

```shell
yarn cli help converter
```

Here we use cURL for examples.

### Uploading with `multipart/form-data`

```shell
$ curl -F file=@example.docx http://127.0.0.1:4000/api/convert/from/docx/to/html > result.html
```

### Uploading RAW Binary Data

```shell
$ curl -X POST \
  -T "example.docx" \
  -H "Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
  -H "Content-Disposition: attachment; filename="example.docx"" \
  http://127.0.0.1:4000/api/convert/from/docx/to/html > result.html
```

### Converting Options

```shell
  /e, /export/<value>     set export filter options
  /f, /format/<value>     specify the output format
  /F, /field/<value>      replace user-defined text field with value
  /i, /import/<value>     set import filter option string
  /o, /output/<value>     output basename, filename or directory
      /password/<value>   provide a password to decrypt the document
```

## Run as Docker Container

`pandoc-api` can start from docker without source code or npm installed:

```shell
docker run -d -p 4000:4000 --name=pandoc --restart=always alphakevin/pandoc-api
```

## Notice

* This is a simple http server and supposed to run as inner micro-service, so it does not include any authorization method. Please take your own risk to deploy it publicly.
* Document formats and options are not fully tested, it just pass them to pandoc.

## License

MIT
