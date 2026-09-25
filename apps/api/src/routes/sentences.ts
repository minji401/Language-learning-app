import { Router } from "express";
import { z } from "zod";

import { getSentence, listSavedSentences, setSentenceSaved } from "../data/sentences";
import { asyncHandler } from "../http";
import { requireUser } from "../middleware/requireUser";

const updateSchema = z.object({
  saved: z.boolean(),
});

export const sentencesRouter = Router();

sentencesRouter.use(requireUser);

sentencesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const sentences = await listSavedSentences(req.userId!);
    res.json({ sentences });
  }),
);

sentencesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const sentence = await getSentence(req.userId!, req.params.id);
    res.json({ sentence });
  }),
);

sentencesRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    const sentence = await setSentenceSaved(req.userId!, req.params.id, input.saved);
    res.json({ sentence });
  }),
);
