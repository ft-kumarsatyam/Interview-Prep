/**
 * Prints ADMIN_PASSWORD_HASH_B64 for .env.local / Vercel.
 * Usage: npm run hash -- 'your-strong-password'
 * Base64 wrapping avoids Next.js expanding the `$` signs inside bcrypt hashes.
 */
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: npm run hash -- '<password of at least 12 characters>'");
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(`ADMIN_PASSWORD_HASH_B64=${Buffer.from(hash, "utf8").toString("base64")}`);
