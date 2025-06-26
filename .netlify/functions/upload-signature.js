
const { google } = require('googleapis');
const stream = require('stream');
const Busboy = require('busboy');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: event.headers });
    const fileBuffers = [];
    let fileName = '';
    let mimeType = '';

    const folderId = '1Ug2MoTYRTnb9EwIigY9lKznrP14rgI9g';

    let serviceAccount;
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    } catch (err) {
      console.error('Invalid service account key:', err);
      return resolve({ statusCode: 500, body: 'Invalid service account key' });
    }

    const auth = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/drive.file']
    );

    const drive = google.drive({ version: 'v3', auth });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      fileName = filename;
      mimeType = mimetype;
      file.on('data', (data) => fileBuffers.push(data));
    });

    busboy.on('finish', async () => {
      try {
        const fileBuffer = Buffer.concat(fileBuffers);
        const bufferStream = new stream.PassThrough();
        bufferStream.end(fileBuffer);

        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [folderId],
          },
          media: {
            mimeType,
            body: bufferStream,
          },
        });

        return resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Signature upload successful', fileId: response.data.id }),
        });
      } catch (error) {
        console.error('Upload failed:', error);
        return resolve({
          statusCode: 500,
          body: JSON.stringify({ message: 'Upload failed', error: error.message }),
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
