import type { DataUIPart, InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type { AppUsage } from "./usage";

export type DataPart = { type: "append-message"; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  usage: AppUsage;
  // Allow future data-* parts without breaking the UIDataTypes constraint
  [key: string]: unknown;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export function isDataUsagePart(
  part: DataUIPart<any>
): part is DataUIPart<CustomUIDataTypes> & {
  type: "data-usage";
  data: AppUsage;
} {
  return part.type === "data-usage";
}

export function isCustomDataPart(
  part: unknown
): part is DataUIPart<CustomUIDataTypes> {
  if (!part || typeof part !== "object") {
    return false;
  }
  const t = (part as any).type;
  if (typeof t !== "string") {
    return false;
  }
  if (!t.startsWith("data-")) {
    return false;
  }

  const allowed = new Set([
    "data-textDelta",
    "data-imageDelta",
    "data-sheetDelta",
    "data-codeDelta",
    "data-suggestion",
    "data-appendMessage",
    "data-id",
    "data-title",
    "data-kind",
    "data-clear",
    "data-finish",
    "data-usage",
  ]);

  return allowed.has(t);
}

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
