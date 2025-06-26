// get-photos.js
exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    body: JSON.stringify(["photo1.jpg", "photo2.jpg"])
  };
};