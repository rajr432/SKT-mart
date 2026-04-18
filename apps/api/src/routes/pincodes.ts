import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/:pincode", async (req, res, next) => {
  try {
    const p = await prisma.pincode.findUnique({ where: { pincode: req.params.pincode } });
    if (!p) {
      res.json({
        pincode: req.params.pincode,
        serviceable: false,
        codAvailable: false,
        etaDays: null,
      });
      return;
    }
    res.json(p);
  } catch (e) {
    next(e);
  }
});

export default router;
