import { checkRecipient, preflight, preflightDeparture, departureStatus, privateHeaders, requestGate, addressInput, transferStatus, publicCheckError, readSmallJson } from '../../../../src/museum/deabstractor/transferServer'
import { readTicket, tokenNumber } from '../../../../src/museum/deabstractor/transfer'
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
export async function POST(request: Request) {
  try {
    requestGate(request)
    const data = await readSmallJson(request)
    let result
    if (data.action === 'recipient') result = await checkRecipient(String(data.to ?? ''), typeof data.from === 'string' ? data.from : undefined)
    else if (data.action === 'preflight') result = await preflight({ from: addressInput(data.from), to: addressInput(data.to), token: tokenNumber(data.token) })
    else if (data.action === 'status') result = await transferStatus(readTicket(data))
    else if (data.action === 'preflight-departure') result = await preflightDeparture(data)
    else if (data.action === 'departure') result = await departureStatus(data)
    else return Response.json({ error: 'Unsupported request.' }, { status: 400, headers: privateHeaders })
    return Response.json(result, { headers: privateHeaders })
  } catch (error) {
    return Response.json({ error: publicCheckError(error) }, { status: 400, headers: privateHeaders })
  }
}
