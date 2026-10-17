import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // Bypass de autenticação para desenvolvimento local
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
