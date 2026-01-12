import {readNonEmptyString} from "./validation.helpers"

export type RegisterDTO = {
  username: string
  password: string
  email: string
  role: "buyer" | "seller"
}

export function validateRegister(input: any): {value?: RegisterDTO, errors?: string[]} {
  const errors: string[] = []
  const username = readNonEmptyString(input?.username, "username", errors)
  const password = readNonEmptyString(input?.password, "password", errors)
  const email = readNonEmptyString(input?.email, "email", errors)
  const role = input?.role
  if (role !== "buyer" && role !== "seller") errors.push("role must be buyer or seller")
  if (errors.length) return {errors}
  return {value: {username, password, email, role}}
}
