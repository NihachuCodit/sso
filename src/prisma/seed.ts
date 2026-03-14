import { prisma } from "../infrastructure/prisma"
import { hashPassword } from "../shared/hash"

async function main() {
  const passwordHash = await hashPassword("Admin@Secure#999!")

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash,
      isVerified: true
    }
  })

  console.log("Seed complete — admin@example.com created (or already exists)")
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
