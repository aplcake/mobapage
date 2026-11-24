import type { LiveJourney } from './liveJourney'

export function shouldConfirmRoomExit(journey?: LiveJourney) {
  return Boolean(journey?.id && ['preparing', 'approval', 'pending'].includes(journey.phase))
}

export const ROOM_EXIT_WARNING = 'A departure is still in progress. Leaving does not cancel a transaction already sent. Stay here to track it, or return to this room to recover its status. Leave the room?'
