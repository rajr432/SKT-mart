import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

router.get("/suggest", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim().toLowerCase();
    if (q.length < 2) {
      res.json({ items: [] });
      return;
    }

    const direct = await prisma.product.findMany({
      where: {
        published: true,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { brand: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 8,
      select: { id: true, name: true, slug: true, price: true, brand: true },
    });

    if (direct.length > 0) {
      res.json({ items: direct, corrected: null });
      return;
    }

    // Typo-tolerant fallback: scan a window of recent products and rank by Levenshtein.
    const candidates = await prisma.product.findMany({
      where: { published: true },
      take: 500,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, slug: true, price: true, brand: true },
    });

    const scored = candidates
      .map((p) => {
        const name = p.name.toLowerCase();
        const tokens = name.split(/\s+/);
        const dist = Math.min(levenshtein(q, name), ...tokens.map((t) => levenshtein(q, t)));
        return { product: p, dist };
      })
      .filter((s) => s.dist <= Math.max(2, Math.floor(q.length / 3)))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 8);

    res.json({
      items: scored.map((s) => s.product),
      corrected: scored[0]?.product.name ?? null,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
