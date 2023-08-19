import bcrypt from "bcrypt";

export async function hashPassword(password: string) {
  const saltRounds = 10;

  try {
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
  } catch (error) {
    console.error("Something went wrong during hashing", error);
  }
}
