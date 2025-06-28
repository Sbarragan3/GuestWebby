const { google } = require('googleapis');
const Busboy = require('busboy');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const busboy = Busboy({ headers: event.headers });
  const fileBuffers = [];

  return new Promise((resolve, reject) => {
    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      const buffers = [];
      file.on('data', data => buffers.push(data));
      file.on('end', () => {
        fileBuffers.push({ buffer: Buffer.concat(buffers), filename, mimetype });
      });
    });

    busboy.on('finish', async () => {
      try {
        const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
        const auth = new google.auth.JWT(
          serviceAccount.client_email,
          null,
          serviceAccount.private_key,
          ['https://www.googleapis.com/auth/drive.file']
        );
        const drive = google.drive({ version: 'v3', auth });

        const upload = await drive.files.create({
          requestBody: {
            name: fileBuffers[0].filename,
            parents: ['1Ug2MoTYRTnb9EwIigY9lKznrP14rgI9g'], // ✍️ Signature folder ID
          },
          media: {
            mimeType: fileBuffers[0].mimetype,
            body: Buffer.from(fileBuffers[0].buffer),
          },
        });

        resolve({
          statusCode: 200,
          body: JSON.stringify({ success: true, fileId: upload.data.id }),
        });
      } catch (err) {
        reject({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
      }
    });

    busboy.end(Buffer.from(event.body, 'base64'));
  });
};
