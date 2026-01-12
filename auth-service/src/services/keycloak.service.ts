type TokenResponse = {access_token: string}

async function getAdminToken() {
  const base = process.env.KEYCLOAK_URL
  const adminUser = process.env.KEYCLOAK_ADMIN_USER
  const adminPass = process.env.KEYCLOAK_ADMIN_PASSWORD
  if (!base || !adminUser || !adminPass) throw new Error("Missing Keycloak admin config")
  const body = new URLSearchParams()
  body.set("grant_type","password")
  body.set("client_id","admin-cli")
  body.set("username", adminUser)
  body.set("password", adminPass)
  const res = await fetch(`${base}/realms/master/protocol/openid-connect/token`, {
    method:"POST",
    headers: {"Content-Type":"application/x-www-form-urlencoded"},
    body
  })
  if (!res.ok) throw new Error("Failed to get admin token")
  const data = await res.json() as TokenResponse
  return data.access_token
}

export async function registerUser(dto: {username: string, email: string, password: string, role: "buyer"|"seller"}) {
  const realm = process.env.KEYCLOAK_REALM
  const base = process.env.KEYCLOAK_URL
  if (!realm || !base) throw new Error("Missing Keycloak realm/url")
  const token = await getAdminToken()
  const userId = await createUser(base, realm, token, dto)
  await setPassword(base, realm, token, userId, dto.password)
  await assignRole(base, realm, token, userId, dto.role)
  return {id: userId, username: dto.username, email: dto.email, role: dto.role}
}

async function createUser(base: string, realm: string, token: string, dto: any) {
  const res = await fetch(`${base}/admin/realms/${realm}/users`, {
    method:"POST",
    headers: {
      "Content-Type":"application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      username: dto.username,
      email: dto.email,
      enabled: true,
      emailVerified: true
    })
  })
  if (res.status === 409) throw new Error("User already exists")
  if (res.status !== 201 && res.status !== 204) {
    const msg = await res.text()
    throw new Error(`Create user failed: ${res.status} ${msg}`)
  }
  const location = res.headers.get("location")
  if (!location) throw new Error("Missing location header")
  const parts = location.split("/")
  return parts[parts.length - 1]
}

async function setPassword(base: string, realm: string, token: string, userId: string, password: string) {
  const res = await fetch(`${base}/admin/realms/${realm}/users/${userId}/reset-password`, {
    method:"PUT",
    headers: {
      "Content-Type":"application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({type:"password", value: password, temporary: false})
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Set password failed: ${res.status} ${msg}`)
  }
}

async function assignRole(base: string, realm: string, token: string, userId: string, roleName: string) {
  const role = await getRole(base, realm, token, roleName)
  const res = await fetch(`${base}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
    method:"POST",
    headers: {
      "Content-Type":"application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify([role])
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Assign role failed: ${res.status} ${msg}`)
  }
}

async function getRole(base: string, realm: string, token: string, roleName: string) {
  const res = await fetch(`${base}/admin/realms/${realm}/roles/${roleName}`, {
    headers: {Authorization: `Bearer ${token}`}
  })
  if (!res.ok) throw new Error(`Role ${roleName} not found`)
  return res.json()
}
