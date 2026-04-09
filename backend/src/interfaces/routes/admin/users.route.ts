import { Router, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { adminMiddleware } from "../../../infrastructure/middleware/adminMiddleware"
import { logAuditEvent } from "../../../infrastructure/audit/auditLogger"

const router = Router()

router.use(authMiddleware, adminMiddleware)

// ─── GET /admin/users — paginated user list ───────────────────────────────────

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const page   = Math.max(1,              Number(req.query.page)   || 1)
    const search = (req.query.search as string | undefined)?.trim()

    const where = search ? { email: { contains: search, mode: "insensitive" as const } } : {}

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:         true,
          email:      true,
          isVerified: true,
          isAdmin:    true,
          isLocked:   true,
          createdAt:  true,
          _count:     { select: { sessions: true } },
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({ users, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── POST /admin/users/:id/lock ───────────────────────────────────────────────

router.post("/:id/lock", async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } })
    if (!user) return res.status(404).json({ error: "User not found" })
    if (user.isLocked) return res.status(400).json({ error: "User is already locked" })

    await prisma.user.update({ where: { id: user.id }, data: { isLocked: true } })

    logAuditEvent("ADMIN_USER_LOCKED", {
      userId: req.user!.userId, ip: req.ip, userAgent: req.headers["user-agent"] as string | undefined,
      success: true, metadata: { targetUserId: user.id },
    })

    res.json({ message: "User locked" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── POST /admin/users/:id/unlock ─────────────────────────────────────────────

router.post("/:id/unlock", async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id as string } })
    if (!user) return res.status(404).json({ error: "User not found" })
    if (!user.isLocked) return res.status(400).json({ error: "User is not locked" })

    await prisma.user.update({ where: { id: user.id }, data: { isLocked: false } })

    logAuditEvent("ADMIN_USER_UNLOCKED", {
      userId: req.user!.userId, ip: req.ip, userAgent: req.headers["user-agent"] as string | undefined,
      success: true, metadata: { targetUserId: user.id },
    })

    res.json({ message: "User unlocked" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
