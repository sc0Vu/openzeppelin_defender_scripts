import BN from 'bignumber.js'
import { request, gql } from 'graphql-request'

export const UNISWAP_V2_THEGRAPH = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2'
export const TOKENLON_STAKING_THEGRAPH = 'https://api.thegraph.com/subgraphs/name/consenlabs/tokenlon-v5-staking'

export const healthCheckTokenSubgraph = async () => {
  const healthCheck = 'https://api.thegraph.com/index-node/graphql'
  const query = gql`
  {
    indexingStatusForCurrentVersion(subgraphName: "consenlabs/tokenlon-v5") {
      synced
      health
      fatalError {
        message
        block {
          number
          hash
        }
        handler
      }
      chains {
        chainHeadBlock {
          number
        }
        latestBlock {
          number
        }
      }
    }
  }`
  const resp = await request(healthCheck, query)
  return resp
}

export interface TokenPrice {
  id: string
  symbol: string
  name: string
  decimals: string
  derivedETH: string
}

export const fetchMultiTokenLatestInfo = async (tokens: string[]) => {
  const query = gql`
    query QueryMultiTokenInfo(
      $tokens: [ID!]
    ) {
      tokens(
        where: {
          id_in: $tokens
        }
      ) {
        id
        symbol
        name
        decimals
        derivedETH
      }
      bundle(id: 1) {
        ethPrice
      }
    }
  `
  const resp = await request(UNISWAP_V2_THEGRAPH, query, {
    tokens: tokens.map(token => token.toLowerCase())
  })
  return {
    ethPrice: resp.bundle.ethPrice,
    tokens: resp.tokens as TokenPrice[]
  }
}

export const fetchPairLatestInfo = async (pair: string) => {
  const query = gql`
    query QueryPairInfo(
      $pair: ID!
    ) {
      pairs(
        where: {
          id: $pair
        }
      ) {
        token0 {
          symbol
          name
          derivedETH
        }
        token1 {
          symbol
          name
          derivedETH
        }
        volumeUSD
        txCount
      }
      bundle(id: 1) {
        ethPrice
      }
    }
  `
  const resp = await request(UNISWAP_V2_THEGRAPH, query, {
    pair: pair.toLowerCase()
  })
  return {
    ethPrice: resp.bundle.ethPrice,
    pair: resp.pairs[0]
  }
}

export interface TokenlonStakingDashboard {
  totalStakedAmount: string
  totalXlonSupply: string
  scaleIndex: string
}

export const fetchStakingDashboard = async (): Promise<TokenlonStakingDashboard> => {
  const query = gql`
    query StakingDashboard(
      $id: ID
    ) {
      stakedTotal (
        id: $id
      ) {
        id
        totalStakedAmount
        scaleIndex
      }
    }
  `
  const resp = await request(TOKENLON_STAKING_THEGRAPH, query, {
    id: "1"
  })
  if (resp.stakedTotal) {
    let { totalStakedAmount, scaleIndex } = resp.stakedTotal
    let totalStakedAmountBN = new BN(totalStakedAmount)
    let scaleIndexBN = new BN(scaleIndex)
    return {
      totalStakedAmount: totalStakedAmountBN.toString(),
      totalXlonSupply: totalStakedAmountBN.div(scaleIndexBN).toString(),
      scaleIndex: scaleIndexBN.toString()
    }
  }
  throw new Error('Fail to fetch dashboard date on tokenlon staking')
}

export interface TokenlonStakingData {
  share: BN
  amount: BN
}

export const fetchStakingData = async (userAddr: string): Promise<TokenlonStakingData> => {
  const query = gql`
    query StakingData(
      $userAddr: String
    ) {
      stakeds (
        where: { user: $userAddr }
      ) {
        amount
        share
      }
    }
  `
  const resp = await request(TOKENLON_STAKING_THEGRAPH, query, {
    userAddr
  })
  if (resp.stakeds) {
    let stakeds: TokenlonStakingData = {
      amount: new BN(0),
      share: new BN(0)
    }
    resp.stakeds.forEach((s: Record<string,string>) => {
      stakeds.amount = stakeds.amount.plus(new BN(s.amount))
      stakeds.share = stakeds.share.plus(new BN(s.share))
    })
    return stakeds
  }
  throw new Error('Fail to fetch staked date for user')
}

export const fetchTradedTokens = async () => {
  const query = gql`
    query TradedTokens(
      $orderBy: String
    ) {
      tradedTokens (
        orderBy: $orderBy,
        orderDirection: asc
      ) {
        contractAddress:address
        symbol
        decimal:decimals
        name
        startDate
      }
    }
  `
  const resp = await request(TOKENLON_STAKING_THEGRAPH, query, {
    orderBy: 'startDate'
  })
  if (resp.tradedTokens) {
    return resp.tradedTokens
  }
  throw new Error('Fail to fetch tokenlon traded tokens')
}
