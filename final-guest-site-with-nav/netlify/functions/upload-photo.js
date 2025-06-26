const { google } = require('googleapis');
const stream = require('stream');
const Busboy = require('busboy');

exports.handler = async function (event, context) {
  context.callbackWaitsForEmptyEventLoop = false;

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const folderId = '1f3_pbr-itTdXzAmbuP2ZQTqIhw-mCuiy';
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

  const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/drive.file']
  );

  const drive = google.drive({ version: 'v3', auth });

  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: event.headers });
    const buffers = [];

    let fileName = 'upload.jpg';
    let mimeType = 'application/octet-stream';

    busboy.on('file', (fieldname, file, info) => {
      fileName = info.filename || fileName;
      mimeType = info.mimeType || mimeType;

      file.on('data', (data) => buffers.push(data));
    });

    busboy.on('finish', async () => {
      const buffer = Buffer.concat(buffers);
      const fileStream = new stream.PassThrough();
      fileStream.end(buffer);

      try {
        await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [folderId],
            mimeType: mimeType
          },
          media: {
            mimeType: mimeType,
            body: fileStream
          }
        });

        resolve({
          statusCode: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ message: 'Upload successful!' })
        });
      } catch (err) {
        console.error('Upload error:', err);
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: 'Upload failed' })
        });
      }
    });

    const encoding = event.isBase64Encoded ? 'base64' : 'utf8';
    busboy.end(Buffer.from(event.body, encoding));
  });
};
