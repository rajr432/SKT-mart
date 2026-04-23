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
        answers: {
          include: { user: { select: { name: true } } },
          orderBy: [{ upvotes: "desc" }, { createdAt: "asc" }],
        },
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
    // Look up question + asker + product name first so we can notify the
    // asker (email) outside the write transaction.
    const q = await prisma.productQuestion.findUnique({
      where: { id: body.questionId },
      include: { user: { select: { id: true, email: true, name: true } }, product: { select: { name: true, slug: true } } },
    });
    if (!q) return res.status(404).json({ error: "Question not found" });
    const a = await prisma.productAnswer.create({
      data: { questionId: body.questionId, userId: req.user!.sub, answer: body.answer },
    });
    // Fire-and-forget asker notification (don't block response).
    if (q.user?.id && q.user.id !== req.user!.sub) {
      prisma.notification.create({
        data: {
          userId: q.user.id,
          type: "SYSTEM",
          title: "Your question has an answer",
          body: `"${q.question}" — new answer on ${q.product?.name ?? "a product"}`,
          link: q.product?.slug ? `/product/${q.product.slug}#qa` : null,
        },
      }).catch(() => { /* non-critical */ });
    }
    res.status(201).json({ answer: a });
  } catch (e) {
    next(e);
  }
});

// Toggle upvote on an answer. Each user can upvote at most once; clicking
// again removes their vote. Keeps denormalized `upvotes` counter in sync
// atomically so the sort-by-upvotes ordering stays correct.
router.post("/answer/:id/vote", requireAuth, async (req, res, next) => {
  try {
    const answerId = req.params.id;
    const userId = req.user!.sub;
    const existing = await prisma.answerVote.findUnique({
      where: { answerId_userId: { answerId, userId } },
    });
    if (existing) {
      const result = await prisma.$transaction([
        prisma.answerVote.delete({ where: { id: existing.id } }),
        prisma.productAnswer.update({
          where: { id: answerId },
          data: { upvotes: { decrement: 1 } },
        }),
      ]);
      return res.json({ upvoted: false, upvotes: result[1].upvotes });
    }
    const result = await prisma.$transaction([
      prisma.answerVote.create({ data: { answerId, userId } }),
      prisma.productAnswer.update({
        where: { id: answerId },
        data: { upvotes: { increment: 1 } },
      }),
    ]);
    res.json({ upvoted: true, upvotes: result[1].upvotes });
  } catch (e) {
    next(e);
  }
});

export default router;
