import ethers from 'ethers'
import { useEffect, useReducer } from 'react'

import usePrice from 'utils/usePrice'
import useOrigin from 'utils/useOrigin'

const tokenAbi = [
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

function reducer(state, newState) {
  return { ...state, ...newState }
}

function useToken(activeToken = {}, totalUsd) {
  const { marketplace, status, provider, signer, signerStatus } = useOrigin()
  const { exchangeRates } = usePrice()
  const [state, setState] = useReducer(reducer, {
    shouldRefetchBalance: 0,
    hasBalance: false,
    loading: true,
    hasAllowance: false
  })

  useEffect(() => {
    const exchangeRate = exchangeRates[activeToken.name]
    async function getBalance() {
      setState({ loading: true })
      try {
        const walletAddress = await signer.getAddress()
        if (walletAddress === ethers.constants.AddressZero) {
          setState({
            hasBalance: false,
            hasAllowance: false,
            loading: false,
            error: 'Active wallet not found'
          })
        } else if (activeToken.id === 'token-ETH') {
          const balance = await provider.getBalance(walletAddress)
          const balanceNum = ethers.utils.formatUnits(balance, 'ether')
          const balanceUSD = Math.floor(
            (Number(balanceNum) / exchangeRates['ETH']) * 100
          )
          const hasBalance = balanceUSD >= totalUsd
          setState({
            hasBalance,
            hasAllowance: true,
            loading: false,
            error: null
          })
        } else if (activeToken.address) {
          const contract = new ethers.Contract(
            activeToken.address,
            tokenAbi,
            signer || provider
          )
          const balance = await contract.balanceOf(walletAddress)
          const balanceNum = ethers.utils.formatUnits(balance, 'ether')
          const balanceUSD = Math.floor(
            (Number(balanceNum) / exchangeRate) * 100
          )
          const hasBalance = balanceUSD > totalUsd
          let hasAllowance = false
          if (hasBalance) {
            const allowance = await contract.allowance(
              walletAddress,
              marketplace.address
            )
            const allowanceNum = ethers.utils.formatUnits(allowance, 'ether')
            const allowanceUSD = Math.ceil(
              (Number(allowanceNum) / exchangeRate) * 100
            )
            // console.log({ allowanceUSD })
            hasAllowance = allowanceUSD >= totalUsd
          }
          setState({
            hasBalance,
            hasAllowance,
            loading: false,
            contract,
            error: null
          })
        } else {
          setState({
            hasAllowance: false,
            hasBalance: false,
            loading: false,
            error: 'Token not configured'
          })
        }
      } catch (e) {
        console.error(e)
        setState({
          hasAllowance: false,
          hasBalance: false,
          loading: false,
          error: 'Token Error'
        })
      }
    }
    if (!signer) {
      setState({
        hasAllowance: false,
        hasBalance: false,
        loading: false,
        error: 'Active wallet not found'
      })
    } else if (!exchangeRate) {
      setState({
        hasAllowance: false,
        hasBalance: false,
        loading: false,
        error: 'No exchange rate for token'
      })
    } else {
      getBalance()
    }
  }, [
    activeToken.name,
    state.shouldRefetchBalance,
    totalUsd,
    signer,
    status,
    marketplace,
    signerStatus
  ])

  return {
    ...state,
    refetchBalance: () => {
      setState({ shouldRefetchBalance: state.shouldRefetchBalance + 1 })
    }
  }
}

export default useToken
