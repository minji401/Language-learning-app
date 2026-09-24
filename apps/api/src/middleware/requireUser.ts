import type { NextFunction, Request, Response } from "express";

import { asyncHandler, HttpError } from "../http";
import { getSupabaseAdmin } from "../lib/supabase";

export const requireUser = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing access token");
  }

  const token = header.slice("Bearer ".length).trim();
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Invalid access token");
  }

  req.userId = data.user.id;
  next();
});
