import type { JobStatus } from '../types'

const LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  done: 'Done',
  failed: 'Failed',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={`chip chip--${status}`}>{LABELS[status]}</span>
}
