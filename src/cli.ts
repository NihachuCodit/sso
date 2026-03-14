/**
 * SSO-IDP Admin CLI
 * Usage: npm run cli -- <command> [args]
 *
 * Commands:
 *   user:list              List all users
 *   user:get <email>       Show user details
 *   user:verify <email>    Mark user as verified
 *   user:revoke <email>    Increment tokenVersion (revoke all tokens)
 *   user:delete <email>    Delete user (cascades sessions + OTPs)
 *   session:list <email>   List sessions for a user
 *   session:revoke <id>    Revoke a session by ID
 *   otp:purge              Delete all expired / used OTPs
 *   stats                  Show system statistics
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const R = "\x1b[0m"
const B = "\x1b[1m"
const C = "\x1b[36m"
const G = "\x1b[32m"
const Y = "\x1b[33m"
const Red = "\x1b[31m"
const D = "\x1b[2m"

function header(title: string) {
  console.log(`\n${C}${B}▸ ${title}${R}`)
  console.log(`${D}${"─".repeat(52)}${R}`)
}

function ok(msg: string)   { console.log(`${G}✓${R} ${msg}`) }
function warn(msg: string) { console.log(`${Y}⚠${R} ${msg}`) }
function err(msg: string)  { console.log(`${Red}✗${R} ${msg}`) }

function row(label: string, value: unknown) {
  const v = value === null || value === undefined ? `${D}—${R}` : String(value)
  console.log(`  ${D}${label.padEnd(18)}${R} ${v}`)
}

// ─── Commands ─────────────────────────────────────────────────────────────────

async function userList() {
  header("Users")
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, isVerified: true, tokenVersion: true, createdAt: true }
  })
  if (!users.length) { warn("No users found"); return }
  for (const u of users) {
    const verified = u.isVerified ? `${G}verified${R}` : `${Y}unverified${R}`
    console.log(`  ${B}${u.email}${R}  ${verified}  ${D}v${u.tokenVersion}  ${u.createdAt.toISOString()}${R}`)
  }
  console.log(`\n  ${D}Total: ${users.length}${R}`)
}

async function userGet(email: string) {
  header(`User: ${email}`)
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      sessions: { orderBy: { createdAt: "desc" }, take: 5 },
      _count: { select: { sessions: true, otps: true, passwordHistory: true } }
    }
  })
  if (!user) { err(`User not found: ${email}`); return }

  row("ID",            user.id)
  row("Email",         user.email)
  row("Verified",      user.isVerified ? `${G}yes${R}` : `${Y}no${R}`)
  row("Token version", user.tokenVersion)
  row("Created",       user.createdAt.toISOString())
  row("Sessions",      user._count.sessions)
  row("OTPs",          user._count.otps)
  row("Pwd history",   user._count.passwordHistory)

  if (user.sessions.length) {
    console.log(`\n  ${D}Recent sessions:${R}`)
    for (const s of user.sessions) {
      const status = s.revoked ? `${Red}revoked${R}` : `${G}active${R}`
      console.log(`    ${D}${s.id}${R}  ${status}  ${D}refreshes:${R} ${s.refreshCounter}`)
    }
  }
}

async function userVerify(email: string) {
  header(`Verify: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  if (user.isVerified) { warn("Already verified"); return }
  await prisma.user.update({ where: { email }, data: { isVerified: true } })
  ok(`${email} marked as verified`)
}

async function userRevoke(email: string) {
  header(`Revoke tokens: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  const updated = await prisma.user.update({
    where: { email },
    data: { tokenVersion: { increment: 1 } }
  })
  ok(`Token version incremented to ${updated.tokenVersion} — all access tokens invalidated`)
}

async function userDelete(email: string) {
  header(`Delete: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  await prisma.user.delete({ where: { email } })
  ok(`User ${email} deleted (sessions and OTPs cascaded)`)
}

async function sessionList(email: string) {
  header(`Sessions: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { refreshTokens: true } } }
  })

  if (!sessions.length) { warn("No sessions"); return }

  for (const s of sessions) {
    const status = s.revoked ? `${Red}revoked${R}` : `${G}active${R}`
    console.log(`\n  ${B}${s.id}${R}`)
    row("Status",   status)
    row("Created",  s.createdAt.toISOString())
    row("Last used",s.lastUsedAt.toISOString())
    row("Refreshes",s.refreshCounter)
    row("Tokens",   s._count.refreshTokens)
  }
}

async function sessionRevoke(sessionId: string) {
  header(`Revoke session: ${sessionId}`)
  const session = await prisma.session.findUnique({ where: { id: sessionId } })
  if (!session) { err("Session not found"); return }
  if (session.revoked) { warn("Session already revoked"); return }
  await prisma.session.update({ where: { id: sessionId }, data: { revoked: true } })
  ok(`Session ${sessionId} revoked`)
}

async function otpPurge() {
  header("Purge expired/used OTPs")
  const result = await prisma.otp.deleteMany({
    where: { OR: [{ used: true }, { expiresAt: { lt: new Date() } }] }
  })
  ok(`Deleted ${result.count} OTP record(s)`)
}

async function stats() {
  header("System statistics")
  const [users, verified, sessions, activeSessions, tokens, usedTokens, otps] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.session.count(),
    prisma.session.count({ where: { revoked: false } }),
    prisma.refreshToken.count(),
    prisma.refreshToken.count({ where: { used: true } }),
    prisma.otp.count({ where: { used: false, expiresAt: { gt: new Date() } } })
  ])

  row("Total users",     users)
  row("Verified users",  `${verified} ${D}/ ${users}${R}`)
  row("Total sessions",  sessions)
  row("Active sessions", activeSessions)
  row("Refresh tokens",  `${usedTokens} used / ${tokens} total`)
  row("Pending OTPs",    otps)
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

const [,, cmd, arg] = process.argv

async function main() {
  console.log(`${C}${B}SSO-IDP Admin CLI${R}  ${D}${new Date().toLocaleString()}${R}`)

  switch (cmd) {
    case "user:list":              await userList();           break
    case "user:get":               await userGet(arg);         break
    case "user:verify":            await userVerify(arg);      break
    case "user:revoke":            await userRevoke(arg);      break
    case "user:delete":            await userDelete(arg);      break
    case "session:list":           await sessionList(arg);     break
    case "session:revoke":         await sessionRevoke(arg);   break
    case "otp:purge":              await otpPurge();           break
    case "stats":                  await stats();              break
    default:
      console.log(`
  ${B}Usage:${R}  npm run cli -- <command> [arg]

  ${C}User commands:${R}
    user:list                  List all users
    user:get     <email>       Show user details + sessions
    user:verify  <email>       Mark user as verified
    user:revoke  <email>       Invalidate all tokens (bump tokenVersion)
    user:delete  <email>       Delete user and cascade

  ${C}Session commands:${R}
    session:list   <email>     List sessions for user
    session:revoke <id>        Revoke session by ID

  ${C}Maintenance:${R}
    otp:purge                  Delete expired and used OTPs
    stats                      Show system-wide statistics
`)
  }

  console.log()
}

main()
  .catch(e => { err(String(e)); process.exit(1) })
  .finally(() => prisma.$disconnect())
