module.exports.handler = async (event) => {
  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Item created",
    }),
  };
};