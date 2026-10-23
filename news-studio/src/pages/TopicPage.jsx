import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import LmNav from '../components/lm/LmNav'
import LmTopicTimeline from '../components/lm/LmTopicTimeline'
import LmFooter from '../components/lm/LmFooter'
import { fetchTrendingTopics } from '../lib/content'
import { parseSlugId } from '../lib/routes'
import { applyHead, topicSeo, FEED_SEO } from '../lib/seo'
import NotFoundPage from './NotFoundPage'

// /topic/<title-slug>-<id> — one page per trending topic's timeline.
export default function TopicPage() {
  const id = parseSlugId(useParams().topic)?.id || ''
  const navigate = useNavigate()
  const location = useLocation()
  // undefined = loading, null = no such (approved) topic
  const [topic, setTopic] = useState(undefined)

  useEffect(() => {
    let alive = true
    setTopic(undefined)
    fetchTrendingTopics().then((all) => {
      if (alive) setTopic(all.find((t) => String(t.id) === id) || null)
    })
    return () => { alive = false }
  }, [id])

  useEffect(() => {
    if (topic) applyHead(topicSeo(topic))
    return () => applyHead(FEED_SEO)
  }, [topic])

  const back = () => (location.key !== 'default' ? navigate(-1) : navigate('/'))

  if (topic === null) return <NotFoundPage />

  return (
    <div className="min-h-screen bg-[#FAFBFD] font-bevietnam text-lm-800">
      <LmNav />
      {topic ? (
        <LmTopicTimeline topic={topic} onClose={back} />
      ) : (
        <div className="min-h-screen pt-[70px]" aria-hidden="true" />
      )}
      <LmFooter />
    </div>
  )
}
