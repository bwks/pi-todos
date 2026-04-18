const ANSI_PATTERN = /\x1b\[[0-9;]*m/g;

function visibleWidth(value: string): number {
	return value.replace(ANSI_PATTERN, "").length;
}

function truncateToVisibleWidth(value: string, width: number): string {
	if (width <= 0) return "";

	let result = "";
	let visible = 0;
	for (let i = 0; i < value.length; i++) {
		const char = value[i]!;
		if (char === "\u001b") {
			const match = value.slice(i).match(/^\x1b\[[0-9;]*m/);
			if (match) {
				result += match[0];
				i += match[0].length - 1;
				continue;
			}
		}
		if (visible >= width) break;
		result += char;
		visible += 1;
	}
	return result;
}

export function getTodoOverlayOptions() {
	return {
		anchor: "center" as const,
		width: "70%" as const,
		minWidth: 40,
		maxWidth: 96,
		maxHeight: "80%" as const,
		margin: 1,
	};
}

export function buildTodoFrameLine(
	width: number,
	content: string,
	borderColor: (value: string) => string,
): string {
	const innerWidth = Math.max(0, width - 2);
	const padded = truncateToVisibleWidth(content, innerWidth);
	const padding = Math.max(0, innerWidth - visibleWidth(padded));
	return borderColor("│") + padded + " ".repeat(padding) + borderColor("│");
}
