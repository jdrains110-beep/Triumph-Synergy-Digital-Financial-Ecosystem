"use client";

import type { DataUIPart } from "ai";
import { useEffect } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { CustomUIDataTypes } from "@/lib/types";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      const part = delta as DataUIPart<CustomUIDataTypes>;
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifact.kind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: part,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        const currentArtifact =
          draftArtifact ?? { ...initialArtifactData, status: "streaming" as const };
        const toString = (value: unknown) =>
          typeof value === "string" ? value : String(value ?? "");

        switch (part.type) {
          case "data-id": {
            return {
              ...currentArtifact,
              documentId: part.data,
              status: "streaming" as const,
            };
          }

          case "data-title": {
            return {
              ...currentArtifact,
              title: part.data,
              status: "streaming" as const,
            };
          }

          case "data-kind": {
            const maybeKind = toString(part.data);
            const knownKinds = artifactDefinitions.map(
              (artifactDefinition) => artifactDefinition.kind
            ) as typeof artifactDefinitions[number]["kind"][];
            const resolvedKind = knownKinds.includes(maybeKind as typeof knownKinds[number])
              ? (maybeKind as typeof knownKinds[number])
              : currentArtifact.kind;

            return {
              ...currentArtifact,
              kind: part.data,
              status: "streaming" as const,
            };
          }

          case "data-clear": {
            return {
              ...currentArtifact,
              content: "",
              status: "streaming" as const,
            };
          }

          case "data-finish": {
            return {
              ...currentArtifact,
              status: "idle" as const,
            };
          }

          default:
            return currentArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream]);

  return null;
}
