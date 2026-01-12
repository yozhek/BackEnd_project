import type {Request,Response,NextFunction} from "express"
import {createRemoteJWKSet, jwtVerify} from "jose"

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (jwks) return jwks
  const issuer = process.env.KEYCLOAK_ISSUER
  const jwksUrl = process.env.KEYCLOAK_JWKS_URL || (issuer ? `${issuer}/protocol/openid-connect/certs` : "")
  if (!jwksUrl) return null
  jwks = createRemoteJWKSet(new URL(jwksUrl))
  return jwks
}

export function requireAuth(requiredRoles: string[] = []) {
  return async (req: Request,res: Response,next: NextFunction) => {
    const issuer = process.env.KEYCLOAK_ISSUER
    const jwksRef = getJwks()
    if (!issuer || !jwksRef) return next() // auth disabled if not configured

    const auth = req.headers.authorization
    if (!auth?.startsWith("Bearer ")) return res.status(401).json({error:"Missing token"})
    const token = auth.substring("Bearer ".length)
    try {
      const {payload} = await jwtVerify(token, jwksRef, {issuer})
      const roles: string[] = Array.isArray(payload.realm_access?.roles) ? payload.realm_access.roles : []
      const username = (payload as any)?.preferred_username || (payload as any)?.email || ""
      const email = (payload as any)?.email || ""
      if (requiredRoles.length && !requiredRoles.some(r => roles.includes(r))) {
        return res.status(403).json({error:"Forbidden"})
      }
      ;(req as any).user = {sub: payload.sub, roles, username, email}
      next()
    } catch (e) {
      return res.status(401).json({error:"Invalid token"})
    }
  }
}
