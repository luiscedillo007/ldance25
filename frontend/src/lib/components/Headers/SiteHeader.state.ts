export function getSiteStatusText(site: string, isActive: boolean) {
	if (!site) return '';
	if (isActive) return `Testing at ${site}`;
	return `Selected site: ${site}`;
} 