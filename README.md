# Openzeppelin Defender Scripts
This repository collect fun scripts that run on openzeppelin defender autotask

* lonstaking
This script will lookup the user's current staking and calculate how many Lon token will earn if redeem at the execution time. Instead showing the total income in token, you can find the total income in USD which calculate from the Uniswap token information. You can also set the threshold value to notify if the earning exceeds the value (in token not in USD).

## Running Locally

You can run the scripts locally, instead of in an Autotask, via a Defender Relayer. Create a Defender Relayer on mainnet, write down the API key and secret, and create a `.env` file in this folder with the following content:

```
lon=0x0000000000095413afc295d19edeb1ad7b71c952
user=
thresholdLon=1
tgToken=
chatID=
```

Then run `yarn build` to compile your script, and `yarn start` that will run your script locally.
