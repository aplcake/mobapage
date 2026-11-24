import { addressInput, inventory, privateHeaders, requestGate, publicCheckError } from '../../../../src/museum/deabstractor/transferServer'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function GET(request: Request) {
  try {
    requestGate(request)
    return Response.json(await inventory(addressInput(new URL(request.url).searchParams.get('address'))), { headers: privateHeaders })
  } catch (error) {
    return Response.json({ error: publicCheckError(error) }, { status: 503, headers: privateHeaders })
  }
}
