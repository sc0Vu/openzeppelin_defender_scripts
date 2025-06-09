// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'
import { healthCheckTokenSubgraph, fetchPairLatestInfo } from './subgraph'
import BN from 'bignumber.js'
import { sendTGMsg } from './utils'

type SecretInfo = {
  uniswapPair: string;
  TG_TOKEN: string;
  CHAT_ID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { uniswapPair, TG_TOKEN, CHAT_ID } = secrets
  if (!uniswapPair || !TG_TOKEN || !CHAT_ID) {
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
    await sendTGMsg(TG_TOKEN, CHAT_ID, message)
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { uniswapPair, TG_TOKEN, CHAT_ID } = process.env as SecretInfo
  handler({ secrets: { uniswapPair, TG_TOKEN, CHAT_ID } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
