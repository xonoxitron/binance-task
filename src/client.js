module.exports.request = async (hostname, path, method, apikey) => {
  return new Promise((resolve, reject) => {
    require("https")
      .request(
        {
          hostname,
          path,
          method,
          headers: {
            "X-MBX-APIKEY": apikey,
          },
        },
        (res) => {
          let data = "";
          res.on("data", (d) => {
            data += d;
          });
          res.on("error", (error) => {
            reject(error);
          });
          res.on("end", () => {
            resolve(data);
          });
        }
      )
      .end();
  });
};
