// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'
import axios from 'axios'
import { healthCheckTokenSubgraph, fetchPairLatestInfo } from './subgraph'
import BN from 'bignumber.js'

type SecretInfo = {
  uniswapPair: string;
  tgToken: string;
  chatID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { uniswapPair, tgToken, chatID } = secrets
  if (!uniswapPair || !tgToken || !chatID) {
    console.warn('Should set secrect properly')
    return
  }
  const status = await healthCheckTokenSubgraph()
  if (status) {
    const pairInfo = await fetchPairLatestInfo(uniswapPair)
    const ethPrice = new BN(pairInfo.ethPrice)
    const token0Price = (new BN(pairInfo.pair.token0.derivedETH)).multipliedBy(ethPrice)
    const token1Price = (new BN(pairInfo.pair.token1.derivedETH)).multipliedBy(ethPrice)
    const volumeUSD = new BN(pairInfo.pair.volumeUSD)
    const message = `Pair (${pairInfo.pair.token0.symbol}/${pairInfo.pair.token1.symbol}) (${token0Price.toPrecision(4, BN.ROUND_CEIL)}/${token1Price.toPrecision(4, BN.ROUND_CEIL)}) tx count ${pairInfo.pair.txCount}, volume in USD ${volumeUSD.toPrecision(4, BN.ROUND_CEIL)}`
    const res = await axios.get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatID}&text=${message}`)
    if (res.data.ok) {
      console.log('Success to notify user in telegram')
    } else {
      console.log('Failed to notify user in telegram')
    }
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { uniswapPair, tgToken, chatID } = process.env as SecretInfo
  handler({ secrets: { uniswapPair, tgToken, chatID } })
    .then(() => process.exit(0))
    .catch((error: Error) => { console.error(error); process.exit(1); });
}
