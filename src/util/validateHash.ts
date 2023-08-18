import bcrypt from "bcrypt";

export function validateHash(candidatePassword: string, hash: string) {
  return bcrypt.compareSync(candidatePassword, hash);
}
