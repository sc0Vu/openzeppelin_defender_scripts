import axios from 'axios'
import { sendTGMsg } from './utils'
import { sheets } from 'googleapis/build/src/apis/sheets'
import { JWT } from 'google-auth-library'
import { createHash } from 'crypto'


const createClient = async (email: string, privateKey: string) => {
  let client = new JWT(
    email,
    null,
    privateKey,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
  await client.authorize()
  return client
}

const fetchSpreadsheet = async (sheets: any, client: any, spreadsheet: string, range: string) => {
  return await sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId: spreadsheet,
    range: range
  })
}

const updateSpreadsheet = async (sheets: any, client: any, spreadsheet: string, range: string, resource: any) => {
  return await sheets.spreadsheets.values.update({
    auth: client,
    spreadsheetId: spreadsheet,
    range: range,
    resource: resource,
    valueInputOption: "USER_ENTERED"
 })
}

const fetchWebInfo = async (method: string, uri: string, headers: string, body: string) => {
  method = method.toLowerCase()
  const options = {};
  if (headers !== undefined && headers !== '') {
    options['headers'] = JSON.parse(headers)
  }
  if (body !== undefined && body !== '') {
    body = JSON.parse(body)
  }
  const { data } = await axios[method](uri, body, options)
  return data
}

type SecretInfo = {
  TG_TOKEN: string;
  SHEET_ID: string;
  WEB_SHEET_RANGE: string;
  CHAT_ID: string;
  GOOGLE_CRED: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { CHAT_ID, TG_TOKEN, SHEET_ID, WEB_SHEET_RANGE, GOOGLE_CRED } = secrets
  if (!CHAT_ID || !TG_TOKEN || !SHEET_ID || !WEB_SHEET_RANGE || !GOOGLE_CRED) {
    console.warn('Should set secrect properly')
    return
  }
  console.log(`Start to watch web`)
  const secretKey = JSON.parse(GOOGLE_CRED)
  try {
    const jwtClient = await createClient( secretKey.client_email, secretKey.private_key)
    let sheet = sheets('v4')
    let isUpdated = false
    const { data } = await fetchSpreadsheet(sheet, jwtClient, SHEET_ID, WEB_SHEET_RANGE)
    let values = data.values
    const updatedIDs = []
    for (let i = 0; i < values.length; i++) {
      let web = values[i]
      const webInfo = await fetchWebInfo(web[2], web[1], web[4], web[3])
      if (webInfo.length < 0) {
        continue
      }
      if (web.length > 6) {
        const strWebInfo = JSON.stringify(webInfo)
        const hashOld = createHash('sha256').update(web[5]).digest('base64')
        const hashNew = createHash('sha256').update(strWebInfo).digest('base64')
        if (hashNew !== hashOld && webInfo.status !== 'ERROR') {
          // update existing data
          web[5] = JSON.stringify(webInfo)
          values[i] = web
          updatedIDs.push(web[0])
        }
      }
    }
    if (updatedIDs.length > 0) {
      // update spreadsheet
      const sheetResource = {
        values,
      }
      const res = await updateSpreadsheet(sheet, jwtClient, SHEET_ID, WEB_SHEET_RANGE, sheetResource)
      if (res.status !== 200) {
        console.log(res.errors)
      }
      const message = `find new update, please check: ${updatedIDs.join(',')}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
    }
  } catch (err) {
    let msg = err.message
    if ('response' in err)  {
      const { data } = err.response
      msg += ' response: ' + data.message ?? ''
    }
    console.log(`Couldn't watch web: ${msg}`)
  }
}

if (require.main === module) {
  require('dotenv').config();
  const { CHAT_ID, TG_TOKEN, SHEET_ID, WEB_SHEET_RANGE, GOOGLE_CRED } = process.env as SecretInfo
  handler({ secrets: { CHAT_ID, TG_TOKEN, SHEET_ID, WEB_SHEET_RANGE, GOOGLE_CRED } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(TG_TOKEN, CHAT_ID, message)
      process.exit(1)
    })
}
