// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'
import { healthCheckTokenSubgraph, fetchStakingDashboard, fetchStakingData, fetchMultiTokenLatestInfo } from './subgraph'
import BN from 'bignumber.js'
import { sendTGMsg } from './utils'

type SecretInfo = {
  lon: string;
  user: string;
  thresholdLon: string;
  TG_TOKEN: string;
  CHAT_ID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { lon, user, thresholdLon, TG_TOKEN, CHAT_ID } = secrets
  if (!lon || !user || !thresholdLon || !TG_TOKEN || !CHAT_ID) {
    console.warn('Should set secrect properly')
    return
  }
  const status = await healthCheckTokenSubgraph()
  if (status) {
    const threshold = new BN(thresholdLon)
    const stakingData = await fetchStakingDashboard()
    const scaleIndex = new BN(stakingData.scaleIndex)
    const staked = await fetchStakingData(user)
    const tokenInfo = await fetchMultiTokenLatestInfo([lon])
    if (tokenInfo.tokens.length != 1) {
      console.warn('Can\'t find any token')
      return
    }
    const tokenDecimals = new BN(10).pow(new BN(tokenInfo.tokens[0].decimals))
    const gainLon = staked.share.multipliedBy(scaleIndex).minus(staked.amount).div(tokenDecimals)
    console.log('Total gained Lon: ', gainLon.toString())
    const tokenPriceUSD = new BN(tokenInfo.tokens[0].derivedETH).multipliedBy(new BN(tokenInfo.ethPrice))
    console.log('Total earned in USD: ', (tokenPriceUSD.multipliedBy(gainLon)).toString())
    if (!gainLon.lt(threshold)) {
      const message = `The lon staking value exceeds the threshold value ${gainLon.toString()} > ${thresholdLon}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
    }
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { lon, user, thresholdLon, TG_TOKEN, CHAT_ID } = process.env as SecretInfo
  handler({ secrets: { lon, user, thresholdLon, TG_TOKEN, CHAT_ID } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to lookup ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
