import { Router, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { logAuditEvent } from "../../../infrastructure/audit/auditLogger"

const router = Router()

// ─── GET /sessions — list sessions for the authenticated user ─────────────────
// Query params:
//   status  "active" | "revoked" | "all"  (default "all")
//   limit   number 1–100                  (default 50)
//   page    number >= 1                   (default 1)

router.get("/", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const status = (req.query.status as string | undefined) ?? "all"
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit)  || 50))
    const page   = Math.max(1,                Number(req.query.page)  || 1)

    if (!["active", "revoked", "all"].includes(status))
      return res.status(400).json({ error: "status must be 'active', 'revoked', or 'all'" })

    const where = {
      userId:  req.user!.userId,
      ...(status === "active"  && { revoked: false }),
      ...(status === "revoked" && { revoked: true  }),
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
        select: {
          id:             true,
          familyId:       true,
          refreshCounter: true,
          deviceInfo:     true,
          revoked:        true,
          lastUsedAt:     true,
          createdAt:      true,
        },
      }),
      prisma.session.count({ where }),
    ])

    res.json({ sessions, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── GET /sessions/:id — fetch a single session ───────────────────────────────

router.get("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: String(req.params.id) } })

    if (!session) return res.status(404).json({ error: "Session not found" })

    if (session.userId !== req.user!.userId)
      return res.status(403).json({ error: "Forbidden" })

    res.json({ session })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

// ─── DELETE /sessions/:id — revoke a specific session ────────────────────────

router.delete("/:id", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: String(req.params.id) } })

    if (!session) return res.status(404).json({ error: "Session not found" })

    if (session.userId !== req.user!.userId)
      return res.status(403).json({ error: "Forbidden" })

    if (session.revoked)
      return res.status(400).json({ error: "Session is already revoked" })

    await prisma.session.update({
      where: { id: session.id },
      data:  { revoked: true },
    })

    logAuditEvent("SESSION_REVOKED", {
      userId:    req.user!.userId,
      sessionId: session.id,
      ip:        req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      success:   true,
    })

    res.json({ message: "Session revoked" })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
