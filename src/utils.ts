import axios from 'axios'

export const sendTGMsg = async (tgToken: string, chatID: string, message: string) => {
  const res = await axios.get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatID}&text=${message}`)
  if (!res.data.ok) {
    throw new Error('failed to send telegram message')
  }
}