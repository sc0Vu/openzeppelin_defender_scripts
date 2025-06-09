import axios from 'axios'
import { sendTGMsg, Uvarint, Varint } from './utils'

type SecretInfo = {
  TG_TOKEN: string;
  katzenmintURL: string;
  CHAT_ID: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { CHAT_ID, TG_TOKEN, katzenmintURL } = secrets
  if (!CHAT_ID || !katzenmintURL || !TG_TOKEN) {
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
        const epoch = Uvarint(value.subarray(0, 7))
        const height = Varint(value.subarray(8))
        message = `current height: ${response.height}, epoch ${epoch}, height: ${height}`
        await sendTGMsg(TG_TOKEN, CHAT_ID, message)
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
  const { CHAT_ID, TG_TOKEN, katzenmintURL } = process.env as SecretInfo
  handler({ secrets: { CHAT_ID, TG_TOKEN, katzenmintURL } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
