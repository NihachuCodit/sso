import { prisma } from './prisma.config'

async function main() {
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      passwordHash: 'hash123',
      isVerified: true,
    },
  })
  console.log('User created')
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
