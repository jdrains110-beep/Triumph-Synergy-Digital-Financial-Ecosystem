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
					currentArtifactDefinition.kind === artifact.kind,
			);

			if (artifactDefinition?.onStreamPart) {
				artifactDefinition.onStreamPart({
					streamPart: part,
					setArtifact,
					setMetadata,
				});
			}

			setArtifact((draftArtifact) => {
				if (!draftArtifact) {
					return { ...initialArtifactData, status: "streaming" };
				}

				switch (part.type) {
					case "data-id":
						return {
							...draftArtifact,
							documentId: part.data,
							status: "streaming",
						};

					case "data-title":
						return {
							...draftArtifact,
							title: part.data,
							status: "streaming",
						};

					case "data-kind":
						return {
							...draftArtifact,
							kind: part.data,
							status: "streaming",
						};

					case "data-clear":
						return {
							...draftArtifact,
							content: "",
							status: "streaming",
						};

					case "data-finish":
						return {
							...draftArtifact,
							status: "idle",
						};

					default:
						return draftArtifact;
				}
			});
		}
	}, [dataStream, setArtifact, setMetadata, artifact, setDataStream]);

	return null;
}
