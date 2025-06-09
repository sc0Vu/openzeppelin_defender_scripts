import { ethers } from 'ethers'
import { BigNumber } from 'bignumber.js'
import { sendTGMsg } from './utils'

type SecretInfo = {
  curvePair: string;
  TG_TOKEN: string;
  CHAT_ID: string;
  apiKey: string;
  threshold: string;
  notifyPairPrice: boolean;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { curvePair, TG_TOKEN, CHAT_ID, apiKey, threshold, notifyPairPrice } = secrets
  if (!curvePair || !TG_TOKEN || !CHAT_ID || !apiKey || !threshold) {
    console.warn('Should set secrect properly')
    return
  }
  // only keep the functions is needed
  const abi = [
    'function symbol() view returns (string)',
    'function coins(uint256 arg0) view returns (address)',
    'function get_dy(int128 i, int128 j, uint256 dx) public returns (uint256)',
  ]

  const erc20Abi = [
    'function symbol() view returns (string)',
  ]

  const uri = 'https://arb-mainnet.g.alchemy.com/v2/' + apiKey
  const provider = new ethers.providers.JsonRpcProvider(uri)
  let crv = new ethers.Contract(curvePair, abi, provider)
  const crvSymbol = await crv.callStatic.symbol()
  let nCoins = 0
  // TODO: find a better way to count n
  if (crvSymbol.length > 0 && crvSymbol.indexOf('CRV') > 0) {
    nCoins = parseInt(crvSymbol.substr(0, 1))
  }
  if (nCoins === 0) {
    throw new Error('cannot find number of coins')
  }

  // add get balances abi
  abi.push('function get_balances() view returns (uint256[' + nCoins + '])')
  crv = new ethers.Contract(curvePair, abi, provider)
  const balances = await crv.callStatic.get_balances()
  const tokens = []
  for (let i = 0; i < nCoins; i++) {
    const coin = await crv.callStatic.coins(i)
    // TODO: call eth_getStorgaeAt directly, batch request or multicall
    const contract = new ethers.Contract(coin, erc20Abi, provider)
    const symbol = await contract.callStatic.symbol()
    tokens.push({
      address: coin,
      symbol: symbol,
      contract: contract,
      balance: balances[i] ?? balances[i]
    })
  }
  // checkout tokens balance?
  // PRECISION: 10e18
  // RATE_MULTIPLIER: 1e30
  // a * RATE_MULTIPLIER / PRECISION
  // TODO: use for loop for > 2 coins
  const one = 1e6
  const priceA = await crv.callStatic.get_dy(0, 1, one)
  const priceB = await crv.callStatic.get_dy(1, 0, one)
  // calculate threshold
  const priceABN = new BigNumber(priceA.toString())
  const priceBBN = new BigNumber(priceB.toString())
  if (!notifyPairPrice) {
    console.log (`${crvSymbol} (${tokens[0].symbol}/${tokens[1].symbol}): ${priceABN.div(one).toString()}`)
    console.log (`${crvSymbol} (${tokens[1].symbol}/${tokens[0].symbol}): ${priceBBN.div(one).toString()}`)
  } else {
    // TODO: send bulk tg message
    await sendTGMsg(TG_TOKEN, CHAT_ID, `${crvSymbol} (${tokens[0].symbol}/${tokens[1].symbol}): price ${priceABN.div(one).toString()}`)
    await sendTGMsg(TG_TOKEN, CHAT_ID, `${crvSymbol} (${tokens[1].symbol}/${tokens[0].symbol}): price ${priceBBN.div(one).toString()}`)
  }
  const thresholdBN = new BigNumber(threshold)
  const diff = priceABN.minus(one).div(one).multipliedBy(100)
  if (diff.abs().gte(thresholdBN)) {
    const message = `${crvSymbol} (${tokens[0].symbol}/${tokens[1].symbol}) price ${priceABN.div(one).toString()} is bigger than threshold ${threshold}`
    await sendTGMsg(TG_TOKEN, CHAT_ID, message)
  }
}

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { curvePair, TG_TOKEN, CHAT_ID, apiKey, threshold, notifyPairPrice } = process.env as SecretInfo
  handler({ secrets: { curvePair, TG_TOKEN, CHAT_ID, apiKey, threshold, notifyPairPrice } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
