
const { google } = require('googleapis');

exports.handler = async function (event) {
  const queryParams = new URLSearchParams(event.rawQuery || '');
  const folderType = queryParams.get('folder') || 'uploads';

  const folderId = folderType === 'signatures'
    ? '1Ug2MoTYRTnb9EwIigY9lKznrP14rgI9g'
    : '1f3_pbr-itTdXzAmbuP2ZQTqIhw-mCuiy';

  try {
    const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

    const auth = new google.auth.JWT(
      serviceAccount.client_email,
      null,
      serviceAccount.private_key,
      ['https://www.googleapis.com/auth/drive.readonly']
    );

    const drive = google.drive({ version: 'v3', auth });

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, webViewLink, webContentLink, mimeType)',
    });

    const files = res.data.files.map(file => ({
      id: file.id,
      name: file.name,
      link: file.webViewLink,
      directDownload: file.webContentLink,
      mimeType: file.mimeType,
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ files }),
    };
  } catch (error) {
    console.error('Failed to list files:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to retrieve photos', error: error.message }),
    };
  }
};
