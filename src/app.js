const binance = require("./binance");

(async () => {
  await binance.checkPositiveAssetBalances();
  await binance.monitorUserAccoutBalance();
  await binance.monitorTopTenSymbols();
})();
