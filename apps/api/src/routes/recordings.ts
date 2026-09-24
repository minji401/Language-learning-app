import { Router } from "express";
import { z } from "zod";

import {
  createRecording,
  getRecording,
  listRecordings,
  listSentencesForRecording,
  replaceSentences,
  updateRecordingStatus,
} from "../data/recordings";
import { asyncHandler, HttpError } from "../http";
import { requireUser } from "../middleware/requireUser";
import { analyzeTranscript } from "../services/analysis";
import { downloadRecording, transcribeAudio } from "../services/transcription";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  source: z.enum(["record", "upload"]),
  audioPath: z.string().trim().min(1),
});

export const recordingsRouter = Router();

recordingsRouter.use(requireUser);

recordingsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const recordings = await listRecordings(req.userId!);
    res.json({ recordings });
  }),
);

recordingsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const userId = req.userId!;
    if (!input.audioPath.startsWith(`${userId}/`)) {
      throw new HttpError(400, "audioPath must live under the signed-in user's folder");
    }

    const recording = await createRecording(userId, input);
    res.status(201).json({ recording });
  }),
);

recordingsRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const recordingId = req.params.id;
    const [recording, sentences] = await Promise.all([
      getRecording(userId, recordingId),
      listSentencesForRecording(userId, recordingId),
    ]);
    res.json({ recording, sentences });
  }),
);

recordingsRouter.post(
  "/:id/process",
  asyncHandler(async (req, res) => {
    const userId = req.userId!;
    const recordingId = req.params.id;
    const recording = await getRecording(userId, recordingId);

    if (recording.status === "transcribing" || recording.status === "analyzing") {
      throw new HttpError(409, "This recording is already being processed");
    }
    if (recording.status === "ready") {
      const sentences = await listSentencesForRecording(userId, recordingId);
      res.json({ recording, sentences });
      return;
    }

    try {
      await updateRecordingStatus(userId, recordingId, {
        status: "transcribing",
        transcript: null,
        errorMessage: null,
      });

      const filename = recording.audioPath.split("/").pop() || "audio.m4a";
      const audio = await downloadRecording(recording.audioPath);
      const transcript = await transcribeAudio(audio, filename);

      await updateRecordingStatus(userId, recordingId, {
        status: "analyzing",
        transcript,
        errorMessage: null,
      });

      const extracted = await analyzeTranscript(transcript);
      await replaceSentences(userId, recordingId, extracted);
      await updateRecordingStatus(userId, recordingId, {
        status: "ready",
        transcript,
        errorMessage: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Processing failed";
      await updateRecordingStatus(userId, recordingId, {
        status: "failed",
        errorMessage: message,
      });
      throw error;
    }

    const [updated, sentences] = await Promise.all([
      getRecording(userId, recordingId),
      listSentencesForRecording(userId, recordingId),
    ]);
    res.json({ recording: updated, sentences });
  }),
);
