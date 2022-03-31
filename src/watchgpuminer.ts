// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'
import axios from 'axios'
import { healthCheckTokenSubgraph, fetchPairLatestInfo } from './subgraph'
import BN from 'bignumber.js'
import { sendTGMsg } from './utils'

type SecretInfo = {
  minerURL: string;
  miner: string;
  thresholdMiner: number;
  tgToken: string;
  chatID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { minerURL, miner, thresholdMiner, tgToken, chatID } = secrets
  if (!minerURL || !miner || !thresholdMiner || !tgToken || !chatID) {
    console.warn('Should set secrect properly')
    return
  }
  console.log(`Start to check miner: ${miner}`)
  try {
    const { data } = await axios.get(minerURL)
    let message = ''
    if (data.data && data.data.workers) {
      const workers = data.data.workers
      if (workers.offline > 0) {
        // filter offlined miner
        const offlineWorkers = workers.list.filter((m: Record<string,any>) => !m.online).map(((m: Record<string,any>) => m.rig))
        message = `Workers ${workers.offline} offlined: ${offlineWorkers.join(', ')}`
        await sendTGMsg(tgToken, chatID, message)
      } else {
        // filter miners that didn't sent for five minutes
        const now = Math.floor((new Date()).getTime() / 1000)
        const threshold = (thresholdMiner > 1200) ? 1200 : thresholdMiner
        const alertWorkers = workers.list.filter((m: Record<string,any>) => (now - m.lastTime) > threshold).map(((m: Record<string,any>) => m.rig))
        
        if (alertWorkers.length > 0) {
          message = `Workers ${alertWorkers.length} disappeared for ${threshold / 60} minutes: ${alertWorkers.join(', ')}`
        } else {
          message = 'Workers are all good!'
        }
        
        await sendTGMsg(tgToken, chatID, message)
      }
    } else {
      throw new Error('data was truncated from server')
    }
  } catch (err) {
    console.log(`Couldn't fetch from miner url: ${err.message}`)
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { minerURL, miner, thresholdMiner, tgToken, chatID } = process.env as SecretInfo
  handler({ secrets: { minerURL, miner, thresholdMiner, tgToken, chatID } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(tgToken, chatID, message)
      process.exit(1)
    })
}
