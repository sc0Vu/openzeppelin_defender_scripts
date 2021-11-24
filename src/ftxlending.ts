import axios from 'axios'
import BN from 'bignumber.js'
import crypto from 'crypto'

type SecretInfo = {
  ftxAccount: string;
  ftxAPIKey: string;
  ftxSecret: string;
  chatID: string;
  tgToken: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { ftxAccount, ftxAPIKey, ftxSecret, chatID, tgToken } = secrets
  if (!ftxAccount || !ftxAPIKey || !ftxSecret || !chatID || !tgToken) {
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

  const res = await getWalletBalance()
  if (res.info && res.info.success) {
    // loop for all coins that balance > 0
    const promises = res.info.result.filter((r: Record<string, any>) => {
      return (new BN(r.total)).gt(ZERO)
    }).map((r: Record<string, any>) => {
      return postSpotMarginOffers({
        coin: r.coin,
        size: r.total,
        rate: 1e-6
      })
    })
    const reses: Array<Record<string, any>> = await Promise.all(promises)
    for (let i = 0; i < reses.length; i++) {
      if (reses[i].success) {
        console.log(reses[i])
      } else {
        const message = `[ftx-lending] failed to lend ${JSON.stringify(reses[i])}`
        const res = await axios.get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatID}&text=${message}`)
        if (!res.data.ok) {
          console.log(message)
        }
      }
    }
    return reses
  } else {
    throw new Error('data was truncated from server')
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { ftxAccount, ftxAPIKey, ftxSecret, chatID, tgToken } = process.env as SecretInfo
  handler({ secrets: { ftxAccount, ftxAPIKey, ftxSecret, chatID, tgToken } })
    .then(() => process.exit(0))
    .catch((error: Error) => { console.error(error); process.exit(1); });
}
