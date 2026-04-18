import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/product/:productId", async (req, res, next) => {
  try {
    const items = await prisma.productQuestion.findMany({
      where: { productId: req.params.productId },
      include: {
        user: { select: { name: true } },
        answers: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

const askSchema = z.object({ productId: z.string(), question: z.string().min(3) });

router.post("/", requireAuth, async (req, res, next) => {
  try {
    const body = askSchema.parse(req.body);
    const q = await prisma.productQuestion.create({
      data: { productId: body.productId, userId: req.user!.sub, question: body.question },
    });
    res.status(201).json({ question: q });
  } catch (e) {
    next(e);
  }
});

const answerSchema = z.object({ questionId: z.string(), answer: z.string().min(2) });

router.post("/answer", requireAuth, async (req, res, next) => {
  try {
    const body = answerSchema.parse(req.body);
    const a = await prisma.productAnswer.create({
      data: { questionId: body.questionId, userId: req.user!.sub, answer: body.answer },
    });
    res.status(201).json({ answer: a });
  } catch (e) {
    next(e);
  }
});

export default router;
