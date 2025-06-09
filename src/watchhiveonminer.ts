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
  TG_TOKEN: string;
  CHAT_ID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { minerURL, miner, thresholdMiner, TG_TOKEN, CHAT_ID } = secrets
  if (!minerURL || !miner || !thresholdMiner || !TG_TOKEN || !CHAT_ID) {
    console.warn('Should set secrect properly')
    return
  }
  console.log(`Start to check miner: ${miner}`)
  try {
    const { data } = await axios.get(minerURL)
    let message = ''
    if (data.workers) {
      const workers = data.workers
      const miners = Object.keys(workers)
      if (miners.length <= 0) {
        throw new Error('empty worker list')
      }
      const now = Math.floor((new Date()).getTime() / 1000)
      const threshold = (thresholdMiner > 1200) ? 1200 : thresholdMiner
      let offlineWorkers = []
      let delayedWorkers = []
      for (let i=0; i<miners.length; i++) {
        const minerName = miners[i]
        const miner = workers[minerName]
        if (!miner.online) {
          offlineWorkers.push(minerName)
        } else {
          const lastShareDt = new Date(miner.sharesStatusStats.lastShareDt)
          const lastShareDs = Math.floor(lastShareDt.getTime() / 1000)
          if ((now - lastShareDs) > threshold) {
            delayedWorkers.push(minerName)
          }
        }
      }
      if (offlineWorkers.length > 0) {
        message = `Workers ${offlineWorkers.length} offlined: ${offlineWorkers.join(', ')}`
        await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      }
      if (delayedWorkers.length > 0) {
        message = `Workers ${delayedWorkers.length} disappeared for ${threshold / 60} minutes: ${delayedWorkers.join(', ')}`
        await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      }
      if (offlineWorkers.length === 0 && delayedWorkers.length === 0) {
        message = 'Workers are all good!'
        await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      }
    } else {
      throw new Error('data was truncated from server')
    }
  } catch (err) {
    console.log(`Couldn't fetch from miner url: ${minerURL} ${err.message}`)
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { minerURL, miner, thresholdMiner, TG_TOKEN, CHAT_ID } = process.env as SecretInfo
  handler({ secrets: { minerURL, miner, thresholdMiner, TG_TOKEN, CHAT_ID } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
