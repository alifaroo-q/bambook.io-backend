import { hashPassword } from "./hashPassword";

export async function validateHash(candidatePassword: string, hash: string) {
    const candidateHash = await hashPassword(candidatePassword)
    return candidateHash === hash
}