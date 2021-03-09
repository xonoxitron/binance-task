const fs = require("fs");
const ws = require("ws");
const crypto = require("./crypto");
const client = require("./client");
const config = require("./config.json");

async function checkPositiveAssetBalances() {
  let payload = `timestamp=${Date.now()}`;
  await crypto
    .getSignature(payload, config.hmac)
    .then(async (signature) => {
      payload += `&signature=${signature}`;
      await client
        .request(
          config.spotApiUri,
          `/api/v3/account?${payload}`,
          "GET",
          config.apikey
        )
        .then((response) => {
          const data = JSON.parse(response);
          if (!data.code) {
            console.log(
              "non-zero assets balance present in the SPOT account:",
              data.balances.filter(
                (b) => Math.abs(parseFloat(b.free) - parseFloat(b.locked)) > 0
              )
            );
          }
        })
        .catch((error) => {
          console.error(error);
        });
    })
    .catch((error) => {
      console.error(error);
    });
}

async function monitorUserAccoutBalance() {
  if (fs.existsSync("./listenKey")) {
    await client.request(
      config.spotApiUri,
      `/api/v3/userDataStream?listenKey=${fs
        .readFileSync("./listenKey")
        .toString()}`,
      "DELETE",
      config.apikey
    );
  }

  // listenKey handling
  const listenKey = JSON.parse(
    await client.request(
      config.spotApiUri,
      `/api/v3/userDataStream`,
      "POST",
      config.apikey
    )
  ).listenKey;

  fs.writeFileSync("./listenKey", listenKey);

  // keep-alive
  setInterval(async () => {
    await client.request(
      config.spotApiUri,
      `/api/v3/userDataStream?listenKey=${listenKey}`,
      "PUT",
      config.apikey
    );
  }, 30 * 60 * 1000); // recommended time span: 30 minutes

  let balance = [];
  let wsClient = new ws(`${config.spotStreamUri}/${listenKey}`);
  wsClient.on("open", () => {
    console.log("[connection opened]");
    wsClient.send(
      JSON.stringify({ method: "SUBSCRIBE", params: ["userData"], id: 1 })
    );
  });
  wsClient.on("close", () => {
    console.log("[connection closed]");
  });
  wsClient.on("error", (e) => {
    console.error("[connection error]", e);
  });
  wsClient.on("ping", (p) => {
    console.log("[ping received]", p.toString());
  });
  wsClient.on("message", async (m) => {
    const data = JSON.parse(m);
    if (data.e && data.e == "outboundAccountPosition") {
      if (balance != data.B) {
        balance = data.B;
        await checkPositiveAssetBalances();
      }
    }
  });
}

async function monitorTopTenSymbols() {
  let events = [];
  let stats = {
    min: Infinity,
    mean: 0,
    max: -Infinity,
  };
  setInterval(() => {
    let len = events.length;
    let sum = 0;
    for (let i = 0; i < len - 1; i++) {
      let dif = Math.abs(events[i] - events[i + 1]);
      if (dif < stats.min) stats.min = dif;
      else if (dif > stats.max) stats.max = dif;
      sum += dif;
    }
    stats.mean = sum / len;
    events = [];
    console.log(stats);
  }, 60 * 1000); // every 60 seconds

  JSON.parse(
    await client.request(
      config.mainnetApiUri,
      `/api/v3/ticker/24hr`,
      "GET",
      config.apikey
    )
  )
    .sort((a, b) => parseFloat(b.volume) - parseFloat(a.volume))
    .slice(0, 10)
    .map((a) => `${a.symbol.toLocaleLowerCase()}@trade`)
    .forEach((s) => {
      new ws(`${config.mainnetStreamUri}/${s}`).on("message", (payload) => {
        let data = JSON.parse(payload);
        events.push(data.E);
      });
    });
}

module.exports.checkPositiveAssetBalances = checkPositiveAssetBalances;
module.exports.monitorUserAccoutBalance = monitorUserAccoutBalance;
module.exports.monitorTopTenSymbols = monitorTopTenSymbols;
