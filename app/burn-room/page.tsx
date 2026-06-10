import { redirect } from 'next/navigation'

// The burn room lives at burn.museumofbased.art — redirect there
export default function BurnRoomPage() {
  redirect('https://burn.museumofbased.art')
}
