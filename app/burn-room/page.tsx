import { redirect } from 'next/navigation'

export const BURN_ROOM_URL = 'https://burn.museumofbased.art/'

export default function Page() {
  redirect(BURN_ROOM_URL)
}
