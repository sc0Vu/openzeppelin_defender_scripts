// import { RelayerParams } from 'defender-relay-client/lib/relayer'
// import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers'
// import { ethers } from 'ethers'
import axios from 'axios'
import { healthCheckTokenSubgraph, fetchPairLatestInfo } from './subgraph'
import BN from 'bignumber.js'

type SecretInfo = {
  minerURL: string;
  miner: string;
  thresholdMiner: number;
  tgToken: string;
  chatID: string;
}

async function sendMessage(tgToken: string, chatID: string, message: string): Promise<Boolean> {
  const res = await axios.get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatID}&text=${message}`)
  return !!res.data.ok
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
        const res = await sendMessage(tgToken, chatID, message)
        if (res) {
          console.log('Success to notify user in telegram')
        } else {
          console.log('Failed to notify user in telegram')
        }
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
        
        const res = await sendMessage(tgToken, chatID, message)
        if (res) {
          console.log('Success to notify user in telegram')
        } else {
          console.log('Failed to notify user in telegram')
        }
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
    .catch((error: Error) => { console.error(error); process.exit(1); });
}
