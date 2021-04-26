// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'

import { healthCheckTokenSubgraph, fetchStakingDashboard, fetchStakingData, fetchMultiTokenLatestInfo } from './subgraph'
import BN from 'bignumber.js'

type SecretInfo = {
  lon: string;
  user: string;
  thresholdLon: string;
}

export async function handler({ secrets }) {
  const { lon, user, thresholdLon } = secrets
  if (!lon || !user || !thresholdLon) {
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
      // TODO: tg bot
      // should notify
    }
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { lon, user, thresholdLon } = process.env as SecretInfo
  handler({ secrets: { lon, user, thresholdLon } })
    .then(() => process.exit(0))
    .catch((error: Error) => { console.error(error); process.exit(1); });
}
