import { useEffect, useState } from 'react'
import Home from './screens/Home'
import Create from './screens/Create'
import Join from './screens/Join'
import Room from './screens/Room'

// 해시 기반 라우팅: #/  #/create  #/join?code=XXX  #/room/XXX
export interface Route {
  path: string
  params: URLSearchParams
}

function parseHash(): Route {
  const hash = window.location.hash.slice(1) || '/'
  const [path, query] = hash.split('?')
  return { path, params: new URLSearchParams(query ?? '') }
}

export function navigate(to: string) {
  window.location.hash = to
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseHash)

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  if (route.path === '/create') return <Create />
  if (route.path === '/join') return <Join initialCode={route.params.get('code') ?? ''} />
  if (route.path.startsWith('/room/')) return <Room code={route.path.slice('/room/'.length)} />
  return <Home />
}
