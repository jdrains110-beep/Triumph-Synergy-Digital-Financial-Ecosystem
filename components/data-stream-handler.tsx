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
          draftArtifact ?? { ...initialArtifactData, status: "streaming" };
        const toString = (value: unknown) =>
          typeof value === "string" ? value : String(value ?? "");

        switch (part.type) {
          case "data-id": {
            return {
              ...currentArtifact,
              documentId: toString(part.data),
              status: "streaming",
            };
          }

          case "data-title": {
            return {
              ...currentArtifact,
              title: toString(part.data),
              status: "streaming",
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
              kind: resolvedKind,
              status: "streaming",
            };
          }

          case "data-clear": {
            return {
              ...currentArtifact,
              content: "",
              status: "streaming",
            };
          }

          case "data-finish": {
            return {
              ...currentArtifact,
              status: "idle",
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
