import type React from "react";

interface PiButtonProps {
	onClick?: () => void;
	children: React.ReactNode;
	disabled?: boolean;
	className?: string;
}

export default function PiButton({
	onClick,
	children,
	disabled = false,
	className = "",
}: PiButtonProps) {
	return (
		<button
			className={`rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
			disabled={disabled}
			onClick={onClick}
		>
			{children}
		</button>
	);
}
