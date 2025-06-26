const { google } = require('googleapis');
const stream = require('stream');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  const Busboy = require('busboy');
  const busboy = Busboy({ headers: event.headers });
  const fileBuffers = [];

  const folderId = '1f3_pbr-itTdXzAmbuP2ZQTqIhw-mCuiy'; // Your correct Google Drive folder ID

  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
  const auth = new google.auth.JWT(
    serviceAccount.client_email,
    null,
    serviceAccount.private_key,
    ['https://www.googleapis.com/auth/drive.file']
  );

  const drive = google.drive({ version: 'v3', auth });

  return new Promise((resolve, reject) => {
    let fileName = '';

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      fileName = filename;
      file.on('data', (data) => fileBuffers.push(data));
    });

    busboy.on('finish', async () => {
      try {
        const bufferStream = new stream.PassThrough();
        bufferStream.end(Buffer.concat(fileBuffers));

        const driveResponse = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [folderId]
          },
          media: {
            mimeType: 'image/jpeg',
            body: bufferStream
          }
        });

        resolve({
          statusCode: 200,
          body: JSON.stringify({ message: 'Upload successful!', id: driveResponse.data.id })
        });
      } catch (error) {
        resolve({
          statusCode: 500,
          body: JSON.stringify({ error: error.message })
        });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
