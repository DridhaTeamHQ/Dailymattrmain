import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import ScrollToTop from './components/ScrollToTop'
import ScrollTopButton from './components/ScrollTopButton'
import { LmDrawerProvider } from './components/lm/LmDrawerContext'
import LmDrawerHost from './components/lm/LmDrawerHost'
import CategoryNewsPage from './pages/CategoryNewsPage'
import StoryPage from './pages/StoryPage'
import TopicPage from './pages/TopicPage'
import { SubscribeRoute, AuthRoute } from './pages/DrawerRoutes'

function App() {
  const location = useLocation()
  return (
    <LmDrawerProvider>
      <ScrollToTop />
      {/* Light cross-page fade — keyed remount per path (no AnimatePresence
          exits, matching the app-wide convention), so navigation eases in
          instead of snapping. Drawer routes reuse the same page underneath, so
          the fade only fires on real page changes. */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {/* dailymattr.com/news-studio is the News Studio feed only — no
            landing page or category pages; any other path lands back on it. */}
        <Routes location={location}>
          <Route path="/" element={<CategoryNewsPage />} />
          {/* Old page URLs now open the matching drawer over the feed */}
          <Route path="/subscribe" element={<SubscribeRoute />} />
          <Route path="/login" element={<AuthRoute />} />
          <Route path="/profile" element={<AuthRoute />} />
          {/* every story and trending topic is its own page, URLs shaped like
              /news: <slug>-<id> (lib/routes.js) */}
          <Route path="/topic/:topic" element={<TopicPage />} />
          <Route path="/:story" element={<StoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
      <ScrollTopButton />
      <LmDrawerHost />
    </LmDrawerProvider>
  )
}

export default App
