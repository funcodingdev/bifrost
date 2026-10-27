import agentsEn from "@/locales/en/agents.json";
import agentsZhCN from "@/locales/zh-CN/agents.json";

import commonEn from "@/locales/en/common.json";
import shellEn from "@/locales/en/shell.json";
import loginEn from "@/locales/en/login.json";
import observabilityEn from "@/locales/en/observability.json";
import modelsEn from "@/locales/en/models.json";
import mcpEn from "@/locales/en/mcp.json";
import governanceEn from "@/locales/en/governance.json";
import configEn from "@/locales/en/config.json";
import commonZhCN from "@/locales/zh-CN/common.json";
import shellZhCN from "@/locales/zh-CN/shell.json";
import loginZhCN from "@/locales/zh-CN/login.json";
import observabilityZhCN from "@/locales/zh-CN/observability.json";
import modelsZhCN from "@/locales/zh-CN/models.json";
import mcpZhCN from "@/locales/zh-CN/mcp.json";
import governanceZhCN from "@/locales/zh-CN/governance.json";
import configZhCN from "@/locales/zh-CN/config.json";

export const NAMESPACES = ["common", "shell", "login", "observability", "models", "mcp", "governance", "config", "agents"] as const;

export type I18nNamespace = (typeof NAMESPACES)[number];

export const resources = {
	en: {
		agents: agentsEn,
		common: commonEn,
		shell: shellEn,
		login: loginEn,
		observability: observabilityEn,
		models: modelsEn,
		mcp: mcpEn,
		governance: governanceEn,
		config: configEn,
	},
	"zh-CN": {
		agents: agentsZhCN,
		common: commonZhCN,
		shell: shellZhCN,
		login: loginZhCN,
		observability: observabilityZhCN,
		models: modelsZhCN,
		mcp: mcpZhCN,
		governance: governanceZhCN,
		config: configZhCN,
	},
} as const;