import { Router, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"
import { authMiddleware, AuthRequest } from "../../../infrastructure/middleware/authMiddleware"
import { adminMiddleware } from "../../../infrastructure/middleware/adminMiddleware"

const router = Router()

router.use(authMiddleware, adminMiddleware)

// ─── GET /admin/audit-logs ────────────────────────────────────────────────────
// Query params:
//   userId   — filter by user ID
//   type     — filter by AuditEventType
//   limit    — 1–100 (default 50)
//   page     — >= 1  (default 1)

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const limit  = Math.min(100, Math.max(1, Number(req.query.limit) || 50))
    const page   = Math.max(1,              Number(req.query.page)   || 1)
    const userId = req.query.userId as string | undefined
    const type   = req.query.type   as string | undefined

    const where = {
      ...(userId && { userId }),
      ...(type   && { eventType: type as any }),
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * limit,
        take:    limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    res.json({ logs, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router
