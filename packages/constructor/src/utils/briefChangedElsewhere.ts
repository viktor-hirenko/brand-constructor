/**
 * The brief moved on while this tab was looking at an older state of it — it
 * was sent to the CEO from another tab, or the CEO acted on it meanwhile
 * (H-29, D-61). Nothing this tab does can be saved any more, so it gets a
 * window with the one action left: load the brief as it is now.
 */
export interface BriefChangedElsewhereCopy {
  title: string
  body: string
  primaryLabel: string
}

const TAIL = 'Зміни з цієї вкладки не збережено. Оновіть сторінку, щоб побачити актуальний бриф.'

export function briefChangedElsewhereCopy(serverStatus: string): BriefChangedElsewhereCopy {
  if (serverStatus === 'submitted') {
    return {
      title: 'Бриф уже відправлено',
      body: `Його відправили на погодження CEO в іншій вкладці. ${TAIL}`,
      primaryLabel: 'Оновити сторінку',
    }
  }
  return {
    title: 'Бриф змінено',
    body: `Статус брифу змінився, поки ця вкладка була відкрита. ${TAIL}`,
    primaryLabel: 'Оновити сторінку',
  }
}

/**
 * A 409 alone does not say the brief moved on: the server also answers 409 to
 * a save it refuses for other reasons. The tab is stale only when the status on
 * the server is no longer the one the tab holds.
 */
export function isBriefChangedElsewhere(localStatus: string, serverStatus: string | null | undefined): boolean {
  return !!serverStatus && serverStatus !== localStatus
}
