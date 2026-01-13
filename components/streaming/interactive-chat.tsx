"use client";

import { Pin, Send } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
	id: string;
	userId: string;
	username: string;
	message: string;
	timestamp: Date;
	isPinned?: boolean;
}

interface InteractiveChatProps {
	messages?: Message[];
	onSendMessage?: (message: string) => void;
	enabled?: boolean;
}

/**
 * Interactive live chat component
 */
export function InteractiveChat({
	messages = [],
	onSendMessage,
	enabled = true,
}: InteractiveChatProps) {
	const [message, setMessage] = React.useState("");
	const [pinnedMessage, setPinnedMessage] = React.useState<Message | null>(
		null,
	);
	const messagesEndRef = React.useRef<HTMLDivElement>(null);
	const scrollContainerRef = React.useRef<HTMLDivElement>(null);

	// Auto-scroll to bottom
	React.useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleSend = () => {
		if (message.trim()) {
			onSendMessage?.(message);
			setMessage("");
		}
	};

	const handlePin = (msg: Message) => {
		setPinnedMessage(pinnedMessage?.id === msg.id ? null : msg);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	if (!enabled) {
		return (
			<Card className="p-4">
				<p className="text-center text-gray-500">
					Chat is disabled for this stream
				</p>
			</Card>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden rounded-lg bg-white">
			{/* Header */}
			<div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
				<h3 className="font-semibold">Live Chat</h3>
				<p className="text-blue-100 text-sm">{messages.length} messages</p>
			</div>

			{/* Pinned Message */}
			{pinnedMessage && (
				<div className="mx-3 mt-3 rounded border-blue-600 border-l-4 bg-blue-50 p-3">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<p className="font-semibold text-blue-600 text-xs">
								📌 Pinned Message
							</p>
							<p className="mt-1 text-gray-700 text-xs">
								{pinnedMessage.message}
							</p>
						</div>
						<button
							className="ml-2 text-blue-600 hover:text-blue-700"
							onClick={() => setPinnedMessage(null)}
						>
							✕
						</button>
					</div>
				</div>
			)}

			{/* Messages */}
			<div
				className="flex-1 space-y-3 overflow-y-auto bg-gray-50 p-4"
				ref={scrollContainerRef}
			>
				{messages.length === 0 ? (
					<div className="flex h-full items-center justify-center">
						<p className="text-center text-gray-400">
							No messages yet. Be the first to chat!
						</p>
					</div>
				) : (
					messages.map((msg) => (
						<div
							className="group rounded bg-white p-3 transition-colors hover:bg-gray-50"
							key={msg.id}
						>
							<div className="flex items-start justify-between">
								<div className="min-w-0 flex-1">
									<p className="font-semibold text-gray-900 text-sm">
										{msg.username}
									</p>
									<p className="mt-1 break-words text-gray-700 text-sm">
										{msg.message}
									</p>
									<p className="mt-1 text-gray-400 text-xs">
										{msg.timestamp.toLocaleTimeString()}
									</p>
								</div>

								{/* Actions */}
								<div className="ml-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
									<button
										className="rounded p-1 hover:bg-gray-200"
										onClick={() => handlePin(msg)}
										title={msg.isPinned ? "Unpin" : "Pin"}
									>
										<Pin className="text-gray-600" size={14} />
									</button>
								</div>
							</div>
						</div>
					))
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<div className="space-y-2 border-t p-3">
				<div className="flex gap-2">
					<Input
						className="flex-1"
						disabled={!enabled}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Type a message..."
						value={message}
					/>
					<Button
						className="bg-blue-600 hover:bg-blue-700"
						disabled={!message.trim() || !enabled}
						onClick={handleSend}
						size="sm"
					>
						<Send size={16} />
					</Button>
				</div>

				{/* Emoji Suggestions */}
				<div className="flex gap-2 text-lg">
					{["👍", "❤️", "😂", "😮", "🔥", "🎉"].map((emoji) => (
						<button
							className="transition-transform hover:scale-125"
							key={emoji}
							onClick={() => {
								setMessage((msg) => msg + emoji);
							}}
							title={emoji}
						>
							{emoji}
						</button>
					))}
				</div>
			</div>
		</div>
	);
}
