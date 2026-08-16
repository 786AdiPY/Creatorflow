import { useState } from 'react'
import { AssetPicker } from './components/AssetPicker'
import { ThumbnailsTab } from './features/thumbnails/ThumbnailsTab'
import { MetadataTab } from './features/metadata/MetadataTab'
import { SchedulerTab } from './features/scheduler/SchedulerTab'
import { AnalyticsTab } from './features/analytics/AnalyticsTab'
import { ModerationTab } from './features/moderation/ModerationTab'
import { ClipsTab } from './features/clips/ClipsTab'

const TABS = [
  { id: 'thumbnails', label: 'Thumbnails' },
  { id: 'metadata', label: 'Metadata' },
  { id: 'scheduler', label: 'Scheduler' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'moderation', label: 'Moderation' },
  { id: 'clips', label: 'Clips' },
] as const

type TabId = (typeof TABS)[number]['id']

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('thumbnails')
  const [contentAssetId, setContentAssetId] = useState<string | null>(null)

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <aside className="w-56 shrink-0 border-r border-gray-200 p-4 dark:border-gray-800">
        <h1 className="mb-6 text-lg font-semibold">CreatorFlow</h1>
        <nav className="space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`block w-full rounded-md px-3 py-2 text-left text-sm ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{TABS.find((t) => t.id === activeTab)?.label}</h2>
          <AssetPicker value={contentAssetId} onChange={setContentAssetId} />
        </div>

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
