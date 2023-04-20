import axios from 'axios'
import { sendTGMsg } from './utils'
import { sheets } from 'googleapis/build/src/apis/sheets'
import { JWT } from 'google-auth-library'


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

const fetchGitInfo = async (repo: string, path: string) => {
  const { data } = await axios.get(`https://api.github.com/repos/${repo}/commits?path=${path}`)
  return data
}

type SecretInfo = {
  tgToken: string;
  sheetID: string;
  sheetRange: string;
  chatID: string;
  googleCred: string;
}

export async function handler({ secrets }: { secrets: SecretInfo }) {
  const { chatID, tgToken, sheetID, sheetRange, googleCred } = secrets
  if (!chatID || !tgToken || !sheetID || !sheetRange || !googleCred) {
    console.warn('Should set secrect properly')
    return
  }
  console.log(`Start to check git commits`)
  const secretKey = JSON.parse(googleCred)
  try {
    const jwtClient = await createClient( secretKey.client_email, secretKey.private_key)
    let sheet = sheets('v4')
    let isUpdated = false
    const { data } = await fetchSpreadsheet(sheet, jwtClient, sheetID, sheetRange)
    let values = data.values
    const updatedIDs = []
    for (let i = 0; i < values.length; i++) {
      let exchange = values[i]
      console.log(`fetch exchange git info ${exchange[0]} ...`)
      const gitInfo = await fetchGitInfo(exchange[2], exchange[3])
      if (gitInfo.length < 0) {
        console.log(`failed to fetch exchange git info ${exchange[0]}`)
        continue
      }
      if (exchange.length < 5) {
        // first
        exchange = exchange.concat([
          gitInfo[0].sha.substr(0, 6),
          gitInfo[0].commit.committer.name,
          gitInfo[0].commit.committer.email,
          gitInfo[0].commit.committer.date
        ])
        values[i] = exchange
        updatedIDs.push(exchange[0])
      } else {
        if (exchange[4] !== gitInfo[0].sha.substr(0, 6)) {
          // update existing exchange
          exchange[4] = gitInfo[0].sha.substr(0, 6)
          exchange[5] = gitInfo[0].commit.committer.name
          exchange[6] = gitInfo[0].commit.committer.email
          exchange[7] = gitInfo[0].commit.committer.date
          values[i] = exchange
          updatedIDs.push(exchange[0])
        }
      }
      console.log(`fetch exchange git info ${exchange[0]} successfully`)
    }
    if (updatedIDs.length > 0) {
      // update spreadsheet
      const sheetResource = {
        values,
      }
      const res = await updateSpreadsheet(sheet, jwtClient, sheetID, sheetRange, sheetResource)
      if (res.status !== 200) {
        console.log(res.errors)
      }
      const message = `find new git commits, please check: ${updatedIDs.join(',')}`
      await sendTGMsg(tgToken, chatID, message)
    }
  } catch (err) {
    console.log(`Couldn't watch git commits: ${err.message}`)
  }
}

if (require.main === module) {
  require('dotenv').config();
  const { chatID, tgToken, sheetID, sheetRange, googleCred } = process.env as SecretInfo
  handler({ secrets: { chatID, tgToken, sheetID, sheetRange, googleCred } })
    .then(() => process.exit(0))
    .catch(async (error: Error) => {
      const message = `Failed to watch ${error.message}`
      await sendTGMsg(tgToken, chatID, message)
      process.exit(1)
    })
}
