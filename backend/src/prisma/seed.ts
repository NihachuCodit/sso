import { prisma } from "../infrastructure/prisma"
import { hashPassword } from "../shared/hash"

async function main() {
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!password) {
    console.error("[seed] SEED_ADMIN_PASSWORD environment variable is not set")
    process.exit(1)
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.upsert({
    where:  { email: "admin@example.com" },
    update: {},
    create: { email: "admin@example.com", passwordHash, isVerified: true },
  })

  console.log("Seed complete — admin@example.com created (or already exists)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
