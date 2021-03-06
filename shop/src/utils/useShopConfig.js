import { useState, useEffect } from 'react'
import memoize from 'lodash/memoize'
import useConfig from 'utils/useConfig'

const getShopConfig = memoize(
  async function fetchOrder(backend, authToken) {
    const result = await fetch(`${backend}/config`, {
      credentials: 'include',
      headers: { authorization: `bearer ${authToken}` }
    }).then((raw) => raw.json())

    return result.config
  },
  (...args) => args[1]
)

function useShopConfig() {
  const { config } = useConfig()
  const [loading, setLoading] = useState(false)
  const [shopConfig, setShopConfig] = useState()

  useEffect(() => {
    async function fetchConfig() {
      setLoading(true)
      const shopConfig = await getShopConfig(
        config.backend,
        config.backendAuthToken
      )
      setLoading(false)
      setShopConfig(shopConfig)
    }
    fetchConfig()
  }, [])

  return { loading, shopConfig }
}

export default useShopConfig
