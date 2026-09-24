import { Router } from "express";
import { z } from "zod";

import { getReviewCard, listDueReviews, saveReviewSchedule } from "../data/reviews";
import { asyncHandler } from "../http";
import { requireUser } from "../middleware/requireUser";
import { applyGrade } from "../services/srs";

const gradeSchema = z.object({
  grade: z.enum(["again", "hard", "good", "easy"]),
});

export const reviewsRouter = Router();

reviewsRouter.use(requireUser);

reviewsRouter.get(
  "/due",
  asyncHandler(async (req, res) => {
    const cards = await listDueReviews(req.userId!);
    res.json({ cards });
  }),
);

reviewsRouter.post(
  "/:id/grade",
  asyncHandler(async (req, res) => {
    const input = gradeSchema.parse(req.body);
    const card = await getReviewCard(req.userId!, req.params.id);
    const next = applyGrade(card, input.grade);
    const updated = await saveReviewSchedule(req.userId!, card.id, next);
    res.json({ card: updated });
  }),
);
