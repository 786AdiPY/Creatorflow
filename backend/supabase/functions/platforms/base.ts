// Every platform integration implements this interface. Adding a platform means
// implementing PlatformConnector once — no changes to any of the six modules.
// See docs §7 (Platform Integration Notes).

export interface PublishPayload {
  contentAssetUrl: string
  title: string
  description: string
  tags: string[]
  thumbnailUrl?: string
}

export interface PublishResult {
  platformPostId: string
  raw: unknown
}

export interface AnalyticsMetrics {
  views?: number
  likes?: number
  comments?: number
  retention?: number
  [key: string]: unknown
}

export interface PlatformComment {
  platformCommentId: string
  author: string
  text: string
}

export interface ModerationAction {
  action: 'hide' | 'flag' | 'approve'
}

export interface PlatformConnector {
  publish(accountId: string, payload: PublishPayload): Promise<PublishResult>
  fetchAnalytics(accountId: string, platformPostId: string): Promise<AnalyticsMetrics>
  fetchComments(accountId: string, platformPostId: string): Promise<PlatformComment[]>
  moderateComment(accountId: string, platformCommentId: string, action: ModerationAction): Promise<void>
}
