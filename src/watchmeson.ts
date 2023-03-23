import axios from 'axios'
import { sendTGMsg } from './utils'

type SecretInfo = {
  tgToken: string;
  katzenmintURL: string;
  chatID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { chatID, tgToken, katzenmintURL } = secrets
  if (!chatID || !katzenmintURL || !tgToken) {
    console.warn('Should set secrect properly')
    return
  }
  console.log(`Start to check katzenmint epoch`)
  const query = `{"Version":"1","Command":5}`
  const hexQuery = Buffer.from(query).toString('hex')
  const url = katzenmintURL + '0x' +  hexQuery
  try {
    const { data } = await axios.get(url)
    let message = ''
    if (data.result && data.result.response) {
      if (data.result.response.code > 0) {
        throw new Error('non 0 response code')
      } else {
        const { response } = data.result
        const value = Buffer.from(response.value, 'base64')
        const bufToInt = (buf: Uint8Array, filterZero=true) => (filterZero) ? parseInt((buf.filter(d => d > 0) as Buffer).toString('hex'), 16) : parseInt((buf as Buffer).toString('hex'), 16)
        const epoch = bufToInt(value.subarray(0, 7))
        const height = bufToInt(value.subarray(8))
        message = `current height: ${response.height}, epoch ${epoch}, height: ${height}`
        await sendTGMsg(tgToken, chatID, message)
      }
    } else {
      throw new Error('data was truncated from server')
    }
    console.log('Checked katzenmint node')
  } catch (err) {
    console.log(`Couldn't fetch from katzenmint url: ${err.message}`)
  }
}

if (require.main === module) {
  require('dotenv').config();
  const { chatID, tgToken, katzenmintURL } = process.env as SecretInfo
  handler({ secrets: { chatID, tgToken, katzenmintURL } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(tgToken, chatID, message)
      process.exit(1)
    })
}
