"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { codeToHtml } from "shiki";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CodeBlockContextType {
	code: string;
}

const CodeBlockContext = createContext<CodeBlockContextType>({
	code: "",
});

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
	code: string;
	language: string;
	showLineNumbers?: boolean;
	children?: ReactNode;
};

export const CodeBlock = ({
	code,
	language,
	showLineNumbers = false,
	className,
	children,
	...props
}: CodeBlockProps) => {
	const [lightHtml, setLightHtml] = useState<string>("");
	const [darkHtml, setDarkHtml] = useState<string>("");

	useEffect(() => {
		const highlightCode = async () => {
			try {
				// Generate HTML for light theme
				const lightResult = await codeToHtml(code, {
					lang: language,
					theme: "github-light",
				});
				setLightHtml(lightResult);

				// Generate HTML for dark theme
				const darkResult = await codeToHtml(code, {
					lang: language,
					theme: "github-dark",
				});
				setDarkHtml(darkResult);
			} catch (error) {
				console.error("Error highlighting code:", error);
				// Fallback to plain code
				setLightHtml(`<pre><code>${code}</code></pre>`);
				setDarkHtml(`<pre><code>${code}</code></pre>`);
			}
		};

		highlightCode();
	}, [code, language]);

	return (
		<CodeBlockContext.Provider value={{ code }}>
			<div
				className={cn(
					"relative w-full overflow-hidden rounded-md border bg-background text-foreground",
					className,
				)}
				{...props}
			>
				<div className="relative">
					<div
						className="overflow-hidden dark:hidden [&_pre]:m-0 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:overflow-x-auto"
						dangerouslySetInnerHTML={{ __html: lightHtml }}
					/>
					<div
						className="hidden overflow-hidden dark:block [&_pre]:m-0 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:overflow-x-auto"
						dangerouslySetInnerHTML={{ __html: darkHtml }}
					/>
					{children && (
						<div className="absolute top-2 right-2 flex items-center gap-2">
							{children}
						</div>
					)}
				</div>
			</div>
		</CodeBlockContext.Provider>
	);
};

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
	onCopy?: () => void;
	onError?: (error: Error) => void;
	timeout?: number;
};

export const CodeBlockCopyButton = ({
	onCopy,
	onError,
	timeout = 2000,
	children,
	className,
	...props
}: CodeBlockCopyButtonProps) => {
	const [isCopied, setIsCopied] = useState(false);
	const { code } = useContext(CodeBlockContext);

	const copyToClipboard = async () => {
		if (typeof window === "undefined" || !navigator.clipboard.writeText) {
			onError?.(new Error("Clipboard API not available"));
			return;
		}

		try {
			await navigator.clipboard.writeText(code);
			setIsCopied(true);
			onCopy?.();
			setTimeout(() => setIsCopied(false), timeout);
		} catch (error) {
			onError?.(error as Error);
		}
	};

	const Icon = isCopied ? CheckIcon : CopyIcon;

	return (
		<Button
			className={cn("shrink-0", className)}
			onClick={copyToClipboard}
			size="icon"
			variant="ghost"
			{...props}
		>
			{children ?? <Icon size={14} />}
		</Button>
	);
};
