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
 *   audit:list [email]     Show recent audit events (optionally filter by user email)
 *   audit:events <type>    Show audit events by type
 *   audit:purge [days]     Delete audit logs older than N days (default 90)
 *   anomaly:list [email]   Show recent anomaly detections (optionally filter by user email)
 */

import { AuditEventType, PrismaClient } from "@prisma/client"

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
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_USER_VERIFIED", userId: user.id, success: true }
  })
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
  await prisma.auditLog.create({
    data: {
      eventType: "ADMIN_USER_REVOKED",
      userId: user.id,
      success: true,
      metadata: { tokenVersion: updated.tokenVersion }
    }
  })
  ok(`Token version incremented to ${updated.tokenVersion} — all access tokens invalidated`)
}

async function userGrantAdmin(email: string) {
  header(`Grant admin: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  if (user.isAdmin) { warn(`${email} is already an admin`); return }
  await prisma.user.update({ where: { email }, data: { isAdmin: true } })
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_GRANT_ADMIN", userId: user.id, success: true, metadata: { email } }
  })
  ok(`${email} is now an admin`)
}

async function userRevokeAdmin(email: string) {
  header(`Revoke admin: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  if (!user.isAdmin) { warn(`${email} is not an admin`); return }
  await prisma.user.update({ where: { email }, data: { isAdmin: false } })
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_REVOKE_ADMIN", userId: user.id, success: true, metadata: { email } }
  })
  ok(`Admin access revoked from ${email}`)
}

async function userLock(email: string) {
  header(`Lock: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  if (user.isLocked) { warn(`${email} is already locked`); return }
  await prisma.user.update({ where: { email }, data: { isLocked: true } })
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_USER_LOCKED", userId: user.id, success: true, metadata: { email } }
  })
  ok(`${email} is now locked — all subsequent API calls will be refused`)
}

async function userUnlock(email: string) {
  header(`Unlock: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  if (!user.isLocked) { warn(`${email} is not locked`); return }
  await prisma.user.update({ where: { email }, data: { isLocked: false } })
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_USER_UNLOCKED", userId: user.id, success: true, metadata: { email } }
  })
  ok(`${email} is now unlocked`)
}

async function userDelete(email: string) {
  header(`Delete: ${email}`)
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) { err(`User not found: ${email}`); return }
  // Log before deletion (userId reference will be gone after cascade)
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_USER_DELETED", userId: user.id, success: true, metadata: { email } }
  })
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
  await prisma.auditLog.create({
    data: { eventType: "ADMIN_SESSION_REVOKED", userId: session.userId, sessionId, success: true }
  })
  ok(`Session ${sessionId} revoked`)
}

async function otpPurge() {
  header("Purge expired/used OTPs")
  const result = await prisma.otp.deleteMany({
    where: { OR: [{ used: true }, { expiresAt: { lt: new Date() } }] }
  })
  ok(`Deleted ${result.count} OTP record(s)`)
}

// ─── Audit Commands ────────────────────────────────────────────────────────────

const EVENT_COLOR: Record<string, string> = {
  LOGIN_SUCCESS:            "\x1b[32m",  // green
  USER_REGISTERED:          "\x1b[32m",
  OTP_VERIFIED:             "\x1b[32m",
  TOKEN_REFRESHED:          "\x1b[32m",
  LOGOUT:                   "\x1b[36m",  // cyan
  OTP_REQUESTED:            "\x1b[36m",
  LOGIN_FAILED:             "\x1b[33m",  // yellow
  OTP_FAILED:               "\x1b[33m",
  USER_VERIFIED:            "\x1b[33m",
  TOKEN_REUSE_DETECTED:     "\x1b[31m",  // red
  OTP_BRUTE_FORCE:          "\x1b[31m",
  ADMIN_USER_VERIFIED:      "\x1b[35m",  // magenta (admin ops)
  ADMIN_USER_DELETED:       "\x1b[35m",
  ADMIN_USER_REVOKED:       "\x1b[35m",
  ADMIN_SESSION_REVOKED:    "\x1b[35m",
  ANOMALY_NEW_DEVICE:          "\x1b[33m",  // yellow (anomalies)
  ANOMALY_NEW_IP:              "\x1b[33m",
  ANOMALY_FINGERPRINT_CHANGED: "\x1b[33m",
  ANOMALY_RAPID_LOGIN:         "\x1b[31m",  // red (higher severity)
  ANOMALY_EXCESSIVE_SESSIONS:  "\x1b[31m",
}

function colorEvent(type: string) {
  const c = EVENT_COLOR[type] ?? ""
  return `${c}${type}${R}`
}

function printAuditEntry(e: {
  id: string
  eventType: string
  userId: string | null
  sessionId: string | null
  ip: string | null
  userAgent: string | null
  success: boolean
  metadata: unknown
  createdAt: Date
}) {
  const status = e.success ? `${G}✓${R}` : `${Red}✗${R}`
  console.log(`\n  ${status} ${colorEvent(e.eventType)}  ${D}${e.createdAt.toISOString()}${R}`)
  if (e.userId)    row("User ID",    e.userId)
  if (e.sessionId) row("Session ID", e.sessionId)
  if (e.ip)        row("IP",         e.ip)
  if (e.userAgent) row("User-Agent", String(e.userAgent).slice(0, 60))
  if (e.metadata)  row("Metadata",   JSON.stringify(e.metadata))
}

async function auditList(email?: string) {
  header(email ? `Audit log: ${email}` : "Audit log (last 50 events)")

  let userId: string | undefined
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) { err(`User not found: ${email}`); return }
    userId = user.id
  }

  const events = await prisma.auditLog.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  if (!events.length) { warn("No audit events found"); return }
  for (const e of events) printAuditEntry(e)
  console.log(`\n  ${D}Showing ${events.length} event(s)${R}`)
}

async function auditEvents(type: string) {
  header(`Audit events: ${type}`)

  if (!Object.values(AuditEventType).includes(type as AuditEventType)) {
    err(`Unknown event type: ${type}`)
    console.log(`  Valid types: ${Object.values(AuditEventType).join(", ")}`)
    return
  }

  const events = await prisma.auditLog.findMany({
    where: { eventType: type as AuditEventType },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  if (!events.length) { warn("No events of this type found"); return }
  for (const e of events) printAuditEntry(e)
  console.log(`\n  ${D}Showing ${events.length} event(s)${R}`)
}

const ANOMALY_EVENTS: AuditEventType[] = [
  "ANOMALY_NEW_DEVICE",
  "ANOMALY_NEW_IP",
  "ANOMALY_RAPID_LOGIN",
  "ANOMALY_EXCESSIVE_SESSIONS",
  "ANOMALY_FINGERPRINT_CHANGED",
]

async function anomalyList(email?: string) {
  header(email ? `Anomalies: ${email}` : "Recent anomaly detections (last 100)")

  let userId: string | undefined
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) { err(`User not found: ${email}`); return }
    userId = user.id
  }

  const events = await prisma.auditLog.findMany({
    where: {
      eventType: { in: ANOMALY_EVENTS },
      ...(userId ? { userId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  if (!events.length) { warn("No anomaly events found"); return }

  // Summary counts
  const counts: Record<string, number> = {}
  for (const e of events) {
    counts[e.eventType] = (counts[e.eventType] ?? 0) + 1
  }
  console.log(`\n  ${D}Summary:${R}`)
  for (const [type, count] of Object.entries(counts)) {
    console.log(`    ${colorEvent(type)}  ×${count}`)
  }

  console.log()
  for (const e of events) printAuditEntry(e)
  console.log(`\n  ${D}Showing ${events.length} anomaly event(s)${R}`)
}

async function auditPurge(daysArg?: string) {
  const days = parseInt(daysArg ?? "90", 10)
  if (isNaN(days) || days < 1) { err("Invalid days argument"); return }

  header(`Purge audit logs older than ${days} days`)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  })
  ok(`Deleted ${result.count} audit log record(s)`)
}

async function tokensPurge() {
  header("Purge used refresh tokens (older than 7 days)")
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const result = await prisma.refreshToken.deleteMany({
    where: { used: true, createdAt: { lt: cutoff } },
  })
  ok(`Deleted ${result.count} used refresh token record(s)`)
}

async function sessionsPurge(daysArg?: string) {
  const days = parseInt(daysArg ?? "30", 10)
  if (isNaN(days) || days < 1) { err("Invalid days argument"); return }

  header(`Purge revoked sessions inactive for more than ${days} days`)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result = await prisma.session.deleteMany({
    where: { revoked: true, lastUsedAt: { lt: cutoff } },
  })
  ok(`Deleted ${result.count} revoked session record(s)`)
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
    case "user:grant-admin":       await userGrantAdmin(arg);  break
    case "user:revoke-admin":      await userRevokeAdmin(arg); break
    case "user:lock":              await userLock(arg);        break
    case "user:unlock":            await userUnlock(arg);      break
    case "session:list":           await sessionList(arg);     break
    case "session:revoke":         await sessionRevoke(arg);   break
    case "otp:purge":              await otpPurge();           break
    case "stats":                  await stats();              break
    case "audit:list":             await auditList(arg);       break
    case "audit:events":           await auditEvents(arg);     break
    case "audit:purge":            await auditPurge(arg);      break
    case "anomaly:list":           await anomalyList(arg);     break
    case "tokens:purge":           await tokensPurge();        break
    case "sessions:purge":         await sessionsPurge(arg);   break
    default:
      console.log(`
  ${B}Usage:${R}  npm run cli -- <command> [arg]

  ${C}User commands:${R}
    user:list                  List all users
    user:get     <email>       Show user details + sessions
    user:verify       <email>  Mark user as verified
    user:revoke       <email>  Invalidate all tokens (bump tokenVersion)
    user:delete       <email>  Delete user and cascade
    user:grant-admin  <email>  Grant admin privileges
    user:revoke-admin <email>  Revoke admin privileges
    user:lock         <email>  Lock account (blocks all API access)
    user:unlock       <email>  Unlock account

  ${C}Session commands:${R}
    session:list   <email>     List sessions for user
    session:revoke <id>        Revoke session by ID

  ${C}Maintenance:${R}
    otp:purge                  Delete expired and used OTPs
    tokens:purge               Delete used refresh tokens older than 7 days
    sessions:purge [days]      Delete revoked sessions older than N days (default 30)
    stats                      Show system-wide statistics

  ${C}Audit log:${R}
    audit:list   [email]       Recent events (optionally filter by user email)
    audit:events <type>        Events by type (e.g. LOGIN_FAILED, TOKEN_REUSE_DETECTED)
    audit:purge  [days]        Delete logs older than N days (default 90)

  ${C}Anomaly detection:${R}
    anomaly:list [email]       Recent anomalies (optionally filter by user email)
`)
  }

  console.log()
}

main()
  .catch(e => { err(String(e)); process.exit(1) })
  .finally(() => prisma.$disconnect())
