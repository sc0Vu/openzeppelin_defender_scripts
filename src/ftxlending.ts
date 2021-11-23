import ccxt from 'ccxt'
import BN from 'bignumber.js'

type SecretInfo = {
  ftxAccount: string;
  ftxAPIKey: string;
  ftxSecret: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { ftxAccount, ftxAPIKey, ftxSecret } = secrets
  if (!ftxAccount || !ftxAPIKey || !ftxSecret) {
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
        console.log('failed to lend: ', reses[i])
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
  const { ftxAccount, ftxAPIKey, ftxSecret } = process.env as SecretInfo
  handler({ secrets: { ftxAccount, ftxAPIKey, ftxSecret } })
    .then(() => process.exit(0))
    .catch((error: Error) => { console.error(error); process.exit(1); });
}
