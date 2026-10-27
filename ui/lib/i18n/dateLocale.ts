import { zhCN, type Locale } from "date-fns/locale";

/** date-fns locale for the active UI language. English stays the library default. */
export function dateFnsLocale(language: string | null | undefined): Locale | undefined {
	return language === "zh-CN" ? zhCN : undefined;
}