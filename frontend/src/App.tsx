import { useState } from 'react'
import {
  Sparkles,
  Image,
  Tag,
  CalendarClock,
  BarChart3,
  MessageSquare,
  Scissors,
  Workflow,
} from 'lucide-react'
import { AssetPicker } from './components/AssetPicker'
import { ThumbnailsTab } from './features/thumbnails/ThumbnailsTab'
import { MetadataTab } from './features/metadata/MetadataTab'
import { SchedulerTab } from './features/scheduler/SchedulerTab'
import { AnalyticsTab } from './features/analytics/AnalyticsTab'
import { ModerationTab } from './features/moderation/ModerationTab'
import { ClipsTab } from './features/clips/ClipsTab'
import { PipelineTab } from './features/pipeline/PipelineTab'

const TABS = [
  { id: 'pipeline', label: 'Pipeline', icon: Workflow },
  { id: 'thumbnails', label: 'Thumbnails', icon: Image },
  { id: 'metadata', label: 'Metadata', icon: Tag },
  { id: 'scheduler', label: 'Scheduler', icon: CalendarClock },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'moderation', label: 'Moderation', icon: MessageSquare },
  { id: 'clips', label: 'Clips', icon: Scissors },
] as const

type TabId = (typeof TABS)[number]['id']

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('pipeline')
  const [contentAssetId, setContentAssetId] = useState<string | null>(null)

  return (
    <div className="app-shell" id="top">
      <aside className="app-sidebar">
        <a className="app-brand" href="#top">
          <span className="brand-mark">
            <Sparkles size={17} strokeWidth={2.4} />
          </span>
          <span className="brand-name">CreatorFlow</span>
        </a>

        <nav className="app-nav" aria-label="Modules">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`nav-link ${activeTab === tab.id ? 'nav-link--active' : ''}`}
              >
                <Icon aria-hidden="true" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <main className="app-main">
        <div className="app-topbar">
          <h1 className="page-title">{TABS.find((t) => t.id === activeTab)?.label}</h1>
          <AssetPicker value={contentAssetId} onChange={setContentAssetId} />
        </div>

        {activeTab === 'pipeline' && <PipelineTab contentAssetId={contentAssetId} />}
        {activeTab === 'thumbnails' && <ThumbnailsTab contentAssetId={contentAssetId} />}
        {activeTab === 'metadata' && <MetadataTab contentAssetId={contentAssetId} />}
        {activeTab === 'scheduler' && <SchedulerTab contentAssetId={contentAssetId} />}
        {activeTab === 'analytics' && <AnalyticsTab />}
        {activeTab === 'moderation' && <ModerationTab />}
        {activeTab === 'clips' && <ClipsTab contentAssetId={contentAssetId} />}
      </main>
    </div>
  )
}

export default App
