export function formatLectureRequest(req: {
  request_type?: string | null
  desired_at?: string | null
  desired_date?: string | null
  start_time?: string | null
  end_time?: string | null
}) {
  const type = req.request_type || 'datetime'

  if (type === 'allday' && req.desired_date) {
    const date = new Date(`${req.desired_date}T12:00:00`)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    }) + '（終日）'
  }

  if (type === 'timerange' && req.desired_date) {
    const date = new Date(`${req.desired_date}T12:00:00`)
    const dateStr = date.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
    })
    return `${dateStr} ${req.start_time ?? '?'}〜${req.end_time ?? '?'}`
  }

  if (req.desired_at) {
    return new Date(req.desired_at).toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric',
      weekday: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  return '日時未設定'
}
