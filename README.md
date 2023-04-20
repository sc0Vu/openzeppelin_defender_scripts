# Openzeppelin Defender Scripts
This repository collect fun scripts that run on openzeppelin defender autotask

> Note: these scripts are experimental, use at your own risk.

### Lon Staking
This script will lookup the user's current staking and calculate how many Lon token will earn if redeem at the execution time. Instead showing the total income in token, you can find the total income in USD which calculate from the Uniswap token information. You can also set the threshold value to notify if the earning exceeds the value (in token not in USD).

```BASH
$ npm run start_lonstaking
```

### Watch Uniswap V2 Pair

This script will fetch uniswap v2 pair information from TheGraph, including tokens name and tokens price.

```BASH
$ npm run start_watchuniswappair
```

### FTX lend automatically

This script will lend tokens in FTX Exchange automatically. When execute this script, it fetch balances, loop through all tokens, and submit spot margin offers for these tokens.

> Remember to open a subaccount and enable option orders.

```BASH
$ npm run start_ftxlending
```

## Running Locally

You can run the scripts locally, instead of in an Autotask, via a Defender Relayer. Create a Defender Relayer on mainnet, write down the API key and secret, and create a `.env` file in this folder with the following content:

```
lon=0x0000000000095413afc295d19edeb1ad7b71c952
user=
thresholdLon=1
tgToken=
chatID=
uniswapPair=
ftxAccount=
ftxAPIKey=
ftxSecret=
```

### Watch Git history

This script will fetch and check whether git history had been modified with the given google sheets, remember to create a service account and google sheets before.

* build

```BASH
$ npm run prebuild
$ npm run build
```

* execute bundled script

```BASH
$ npm run start_watchgit
```