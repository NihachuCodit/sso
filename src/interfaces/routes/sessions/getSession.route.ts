import { Router, Request, Response } from "express"
import { prisma } from "../../../infrastructure/prisma"

const router = Router()

router.get("/:id", async (req: Request, res: Response) => {
  try {
    let { id } = req.params
    // Если id пришёл как массив (редко), берём первый элемент
    const sessionId = Array.isArray(id) ? id[0] : id

    const session = await prisma.session.findUnique({
      where: { id: sessionId }
    })

    if (!session) return res.status(404).json({ error: "Session not found" })

    res.json({ session })
  } catch (err: any) {
    res.status(400).json({ error: err.message })
  }
})

export default router