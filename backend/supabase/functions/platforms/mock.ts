import type {
  PlatformConnector,
  PublishPayload,
  PublishResult,
  AnalyticsMetrics,
  PlatformComment,
  ModerationAction,
} from './base.ts'

// Mock connector so the full pipeline runs end-to-end before real OAuth/API wiring
// lands for a given platform (per docs §7 — YouTube first, others follow the same interface).
export class MockConnector implements PlatformConnector {
  async publish(_accountId: string, _payload: PublishPayload): Promise<PublishResult> {
    return { platformPostId: `mock_${crypto.randomUUID()}`, raw: {} }
  }

  async fetchAnalytics(_accountId: string, _platformPostId: string): Promise<AnalyticsMetrics> {
    return {
      views: Math.floor(Math.random() * 10000),
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      retention: Math.random(),
    }
  }

  async fetchComments(_accountId: string, _platformPostId: string): Promise<PlatformComment[]> {
    return []
  }

  async moderateComment(_accountId: string, _platformCommentId: string, _action: ModerationAction): Promise<void> {
    return
  }
}

export function getConnector(_platform: string): PlatformConnector {
  // Swap in a real connector per platform (YouTubeConnector, etc.) as they're built.
  return new MockConnector()
}
