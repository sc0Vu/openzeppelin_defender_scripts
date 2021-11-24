import ccxt from 'ccxt'
import axios from 'axios'
import BN from 'bignumber.js'

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
  const client = new ccxt.ftx({
    apiKey: ftxAPIKey,
    secret: ftxSecret,
    headers: {
      'FTX-SUBACCOUNT': ftxAccount
    }
  })
  const res = await client.fetch_balance()
  if (res.info && res.info.success) {
    // loop for all coins that balance > 0
    const promises = res.info.result.filter((r: Record<string, any>) => {
      return (new BN(r.total)).gt(ZERO)
    }).map((r: Record<string, any>) => {
      return client.private_post_spot_margin_offers({
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
