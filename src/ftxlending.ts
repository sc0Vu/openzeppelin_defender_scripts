import axios from 'axios'
import BN from 'bignumber.js'
import crypto from 'crypto'
import { sendTGMsg } from './utils'

type SecretInfo = {
  ftxAccount: string;
  ftxAPIKey: string;
  ftxSecret: string;
  CHAT_ID: string;
  TG_TOKEN: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { ftxAccount, ftxAPIKey, ftxSecret, CHAT_ID, TG_TOKEN } = secrets
  if (!ftxAccount || !ftxAPIKey || !ftxSecret || !CHAT_ID || !TG_TOKEN) {
    console.warn('Should set secrect properly')
    return
  }
  const ZERO = new BN(0)
  const API_ENDPOINT = 'https://ftx.com'
  const sha256Hmac = (data: string) : string => {
    const hmac = crypto.createHmac('sha256', ftxSecret)
    hmac.update(data)
    return hmac.digest('hex')
  }

  const sendRequest = async (method: string, path: string, headers: Record<string,any> = {}, data: any = undefined) : Promise<Record<string,any>> => {
    const url = `${API_ENDPOINT}${path}`
    const timestamp = (new Date()).getTime().toString()
    let auth = timestamp + method + path
    let request: Record<string,any> = {
      url,
      method
    }
    headers['User-Agent'] = 'ftx-lending-bot/0.1'
    if (method == 'POST') {
      let body = JSON.stringify(data)
      auth += body
      headers['Content-Type'] = 'application/json'
      request.data = body
    }
    const signature = sha256Hmac(auth)
    headers['FTX-KEY'] = ftxAPIKey
    headers['FTX-TS'] = timestamp
    headers['FTX-SIGN'] = signature
    headers['FTX-SUBACCOUNT'] = ftxAccount
    request.headers = headers
    return await axios.request(request)
  }

  const getWalletBalance = async () : Promise<Record<string,any>> => {
    const path = '/api/wallet/balances'
    const method = 'GET'
    let result = {
      info: {}
    }
    const res = await sendRequest(method, path)
    if (res.status == 200) {
      result.info = res.data
      return result
    }
    throw new Error('failed to get wallet balances')
  }

  const postSpotMarginOffers = async (data: Record<string,any>) : Promise<Record<string,any>> => {
    const path = '/api/spot_margin/offers'
    const method = 'POST'
    const res = await sendRequest(method, path, {}, data)
    if (res.status == 200) {
      return res.data
    }
    throw new Error('failed to post spot margin offers')
  }

  const getSpotMarginLendingRates = async () : Promise<Record<string,any>> => {
    const path = '/api/spot_margin/lending_rates'
    const method = 'GET'
    const res = await sendRequest(method, path)
    if (res.status == 200) {
      const data = res.data
      const spotMarginLendingRates: Record<string,any> = {}
      if (data.success) {
        for (let i=0; i<data.result.length; i++) {
          const coin = data.result[i]
          spotMarginLendingRates[coin.coin] = coin
        }
      }
      return spotMarginLendingRates
    }
    throw new Error('failed to get spot margin lending rates')
  }

  const res = await getWalletBalance()
  if (res.info && res.info.success) {
    // loop for all coins that balance > 0
    const availBalance = res.info.result.filter((r: Record<string, any>) => {
      return (new BN(r.total)).gt(ZERO)
    })
    const spotMarginLendingRates = await getSpotMarginLendingRates()
    const promises = availBalance.map((r: Record<string, any>) => {
      const lendingRate = spotMarginLendingRates[r.coin]
      const rate = lendingRate && lendingRate.estimate > 0 ? lendingRate.estimate : 1e-6
      console.log(`[ftx-lending] lend ${r.coin} ${rate}`)
      return postSpotMarginOffers({
        coin: r.coin,
        size: r.total,
        rate: rate
      })
    })
    let reses: Array<Record<string, any>> = []
    try {
      reses = await Promise.all(promises)
      for (let i = 0; i < reses.length; i++) {
        if (reses[i].success) {
          console.log(`[ftx-lending] lend ${res.info.result[i].coin} success`)
        } else {
          const message = `[ftx-lending] failed to lend ${res.info.result[i].coin} ${JSON.stringify(reses[i])}`
          await sendTGMsg(TG_TOKEN, CHAT_ID, message)
        }
      }
    } catch (err) {
      const message = `[ftx-lending] failed to lend ${err.response.data}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
    }
    return reses
  } else {
    throw new Error('data was truncated from server')
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { ftxAccount, ftxAPIKey, ftxSecret, CHAT_ID, TG_TOKEN } = process.env as SecretInfo
  handler({ secrets: { ftxAccount, ftxAPIKey, ftxSecret, CHAT_ID, TG_TOKEN } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `[ftx-lending] failed to lend ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
