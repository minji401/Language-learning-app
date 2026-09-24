import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import { config } from "./config";
import { errorHandler, HttpError } from "./http";
import { recordingsRouter } from "./routes/recordings";
import { reviewsRouter } from "./routes/reviews";
import { sentencesRouter } from "./routes/sentences";

export function createApp() {
  const app = express();
  app.use(cors({ origin: config.corsOrigin === "*" ? true : config.corsOrigin }));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "contextual-echo-api" });
  });

  app.use("/recordings", recordingsRouter);
  app.use("/sentences", sentencesRouter);
  app.use("/reviews", reviewsRouter);

  app.use((err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ZodError) {
      next(new HttpError(400, "Request body is invalid"));
      return;
    }
    errorHandler(err, req, res, next);
  });

  return app;
}
