import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdownMenu";
import { Check, Languages } from "lucide-react";

import { SUPPORTED_LOCALES, getLocale, setLocale, type LocaleCode } from "../runtime";

// This component lives under ui/i18n/, which the auto-i18n transform skips, so
// its own copy is written out per locale rather than translated. There is very
// little of it: language names are always shown in their own language, which is
// what lets someone who cannot read the current UI language find their way out.
const SR_LABEL: Record<LocaleCode, string> = {
	en: "Language",
	"zh-CN": "语言",
};

export function LocaleToggle() {
	const current = getLocale();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					// Matches ThemeToggle's trigger exactly — these two sit next to each
					// other in the topbar and any drift shows up as uneven spacing.
					className="text-muted-foreground hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-card data-[state=open]:text-accent-foreground size-8 border-0 ring-offset-0 outline-none select-none focus-visible:ring-0 data-[state=open]:border"
					data-testid="locale-toggle"
				>
					<Languages className="size-4" strokeWidth={2} />
					<span className="sr-only">{SR_LABEL[current]}</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" sideOffset={2}>
				{SUPPORTED_LOCALES.map(({ code, label }) => (
					<DropdownMenuItem key={code} onClick={() => setLocale(code)} className="cursor-pointer">
						<span className="flex-1">{label}</span>
						{current === code && <Check className="text-muted-foreground size-3.5" strokeWidth={2.5} />}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}