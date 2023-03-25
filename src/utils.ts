import axios from 'axios'

const MaxVarintLen64 = 10

export const sendTGMsg = async (tgToken: string, chatID: string, message: string) => {
  const res = await axios.get(`https://api.telegram.org/bot${tgToken}/sendMessage?chat_id=${chatID}&text=${message}`)
  if (!res.data.ok) {
    throw new Error('failed to send telegram message')
  }
}

// binary operation for golang
export function Uvarint(buf: Buffer): number {
  let x = 0, s = 0
	for (let i=0; i<buf.length; i++) {
	  const b = buf[i]
    // overflow
		if (i === MaxVarintLen64) return 0
		if (b < 0x80) {
      // overflow
			if (i === MaxVarintLen64-1 && b > 1) return 0
			return x | b << s
		}
		x = x | (b & 0x7f) << s
		s += 7
	}
	return 0
}

// binary operation for golang
export function Varint(buf: Buffer): Number {
  const u = Uvarint(buf)
  let x = u >> 1
  if ((x & 1) !== 0) {
    x = 0 ^ x
  }
  return x
}