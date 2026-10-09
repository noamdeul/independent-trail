import { useEffect, useRef } from 'react'
import { defaultRouteId, getRoute } from './content'
import { Header } from './components/Header'
import { parseHash, useHash } from './lib/router'
import { useOfflineReady } from './lib/useOfflineReady'
import { useOnline } from './lib/useOnline'
import { useTrail } from './lib/useTrail'
import { AboutScreen } from './screens/AboutScreen'
import { FinishScreen } from './screens/FinishScreen'
import { StationScreen } from './screens/StationScreen'
import { StationsScreen } from './screens/StationsScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'

const route = getRoute(defaultRouteId)

export default function App() {
  const hash = useHash()
  const screen = parseHash(hash)
  const trail = useTrail(route)
  const online = useOnline()
  const offline = useOfflineReady()
  const firstScreen = useRef(true)

  const stationName = screen.name === 'station' ? route.stations.find((s) => s.id === screen.id)?.name : undefined
  const screenTitle =
    screen.name === 'station'
      ? stationName
      : { welcome: undefined, stations: 'כל התחנות', finish: 'סיום', about: 'על המסלול ומקורות' }[screen.name]

  // On every screen change: update the tab title, scroll to top and move focus
  // to the screen heading so screen readers announce the new screen.
  useEffect(() => {
    document.title = screenTitle ? `${screenTitle} · ${route.title}` : route.title
    if (firstScreen.current) {
      firstScreen.current = false
      return
    }
    window.scrollTo(0, 0)
    requestAnimationFrame(() => document.getElementById('screen-title')?.focus({ preventScroll: true }))
  }, [hash, screenTitle])

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => {
        e.preventDefault()
        document.getElementById('screen-title')?.focus()
      }}>
        דילוג לתוכן
      </a>
      <Header title={route.title} current={screen.name} />
      {!online && (
        <p className="banner banner-offline" role="status">
          אין חיבור לאינטרנט. הסיפורים והמשימות זמינים, אבל הניווט במפות צריך חיבור.
        </p>
      )}
      {!trail.persistent && (
        <p className="banner banner-storage" role="status">
          השמירה במכשיר לא זמינה (אולי גלישה פרטית). ההתקדמות תישמר רק כל עוד הדף פתוח.
        </p>
      )}
      <main id="main">
        {screen.name === 'welcome' && <WelcomeScreen route={route} trail={trail} />}
        {screen.name === 'station' && (
          <StationScreen key={screen.id} route={route} trail={trail} stationId={screen.id} />
        )}
        {screen.name === 'stations' && <StationsScreen route={route} trail={trail} />}
        {screen.name === 'finish' && <FinishScreen route={route} trail={trail} />}
        {screen.name === 'about' && <AboutScreen route={route} offline={offline} />}
      </main>
    </div>
  )
}
