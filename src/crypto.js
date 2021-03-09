module.exports.getSignature = async (payload, hmac) => {
  return new Promise((resolve, reject) => {
    const command = `bash -c "echo -n ${payload} | openssl dgst -sha256 -hmac ${hmac}"`;
    require("child_process").exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      if (stderr) reject(stderr);
      resolve(stdout.trim());
    });
  });
};

if (process.argv[2] == "--test-signature") {
  (async () => {
    const test_hmac =
      "NhqPtmdSJYdKjVHjA7PZj4Mge3R5YNiP1e3UZjInClVN65XAbvqqM6A7H5fATj0j";
    const test_payload = "timestamp=1578963600000";
    const test_signature =
      "d84e6641b1e328e7b418fff030caed655c266299c9355e36ce801ed14631eed4";
    let obtained_signature = await this.getSignature(test_payload, test_hmac);
    console.log("obtained_signature =>", obtained_signature);
    console.log("test_signature =>", test_signature);
    console.log("assert equals => ", obtained_signature === test_signature);
    process.exit();
  })();
}
