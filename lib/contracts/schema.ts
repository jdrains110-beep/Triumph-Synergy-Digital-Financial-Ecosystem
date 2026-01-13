/**
 * Contract Database Schema
 * Drizzle ORM schema for legal contracts management
 */

import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

// Note: Enums defined in lib/contracts/types.ts instead

// Main Contracts Table
export const contracts = pgTable(
	"contracts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		type: varchar("type", { length: 50 }).notNull(),
		title: varchar("title", { length: 255 }).notNull(),
		version: varchar("version", { length: 20 }).notNull(),
		content: text("content").notNull(),
		htmlContent: text("html_content"),
		status: varchar("status", { length: 50 }).notNull().default("DRAFT"),
		jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),
		effectiveDate: timestamp("effective_date").notNull(),
		expiryDate: timestamp("expiry_date"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
		createdBy: uuid("created_by").notNull(),
		tags: jsonb("tags").$type<string[]>().default([]),
	},
	(table) => ({
		typeIndex: index("idx_contracts_type").on(table.type),
		statusIndex: index("idx_contracts_status").on(table.status),
		createdByIndex: index("idx_contracts_created_by").on(table.createdBy),
	}),
);

// Contract Signatures Table
export const contractSignatures = pgTable(
	"contract_signatures",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => contracts.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		displayName: varchar("display_name", { length: 255 }).notNull(),
		signatureMethod: varchar("signature_method", { length: 50 }).notNull(),
		signatureData: text("signature_data").notNull(),
		docuSignEnvelopeId: varchar("docusign_envelope_id", { length: 255 }),
		signedAt: timestamp("signed_at").notNull(),
		validUntil: timestamp("valid_until"),
		ipAddress: varchar("ip_address", { length: 45 }).notNull(),
		userAgent: text("user_agent").notNull(),
		deviceInfo: jsonb("device_info")
			.$type<{
				platform: string;
				browser: string;
				deviceType: string;
			}>()
			.notNull(),
		location: jsonb("location").$type<{
			country: string;
			city: string;
			coordinates?: { latitude: number; longitude: number };
		}>(),
		screenshotHash: varchar("screenshot_hash", { length: 255 }),
		blockchainTxHash: varchar("blockchain_tx_hash", { length: 255 }),
		createdAt: timestamp("created_at").notNull().defaultNow(),
	},
	(table) => ({
		contractIndex: index("idx_signatures_contract").on(table.contractId),
		userIndex: index("idx_signatures_user").on(table.userId),
		contractUserUnique: uniqueIndex("idx_signatures_contract_user").on(
			table.contractId,
			table.userId,
		),
	}),
);

// User Consent Tracking Table
export const userConsents = pgTable(
	"user_consents",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: uuid("user_id").notNull(),
		email: varchar("email", { length: 255 }).notNull(),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => contracts.id, { onDelete: "cascade" }),
		contractType: varchar("contract_type", { length: 50 }).notNull(),
		consentStatus: varchar("consent_status", { length: 50 })
			.notNull()
			.default("NOT_REQUESTED"),
		acceptedAt: timestamp("accepted_at"),
		rejectedAt: timestamp("rejected_at"),
		withdrawnAt: timestamp("withdrawn_at"),
		ipAddress: varchar("ip_address", { length: 45 }).notNull(),
		userAgent: text("user_agent").notNull(),
		consentVersion: varchar("consent_version", { length: 20 }).notNull(),
		expiresAt: timestamp("expires_at"),
		notes: text("notes"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		userIndex: index("idx_consents_user").on(table.userId),
		contractIndex: index("idx_consents_contract").on(table.contractId),
		statusIndex: index("idx_consents_status").on(table.consentStatus),
		userContractUnique: uniqueIndex("idx_consents_user_contract").on(
			table.userId,
			table.contractId,
		),
	}),
);

// Audit Logs Table
export const contractAuditLogs = pgTable(
	"contract_audit_logs",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contractId: uuid("contract_id").references(() => contracts.id, {
			onDelete: "cascade",
		}),
		signatureId: uuid("signature_id").references(() => contractSignatures.id, {
			onDelete: "cascade",
		}),
		consentId: uuid("consent_id").references(() => userConsents.id, {
			onDelete: "cascade",
		}),
		userId: uuid("user_id").notNull(),
		action: varchar("action", { length: 50 }).notNull(), // created, viewed, signed, rejected, withdrawn, downloaded
		timestamp: timestamp("timestamp").notNull().defaultNow(),
		ipAddress: varchar("ip_address", { length: 45 }).notNull(),
		userAgent: text("user_agent").notNull(),
		details: jsonb("details").$type<Record<string, any>>().default({}),
		screenshot: jsonb("screenshot").$type<{
			hash: string;
			timestamp: Date;
			description: string;
		}>(),
		changeLog: jsonb("change_log").$type<{
			before: Record<string, any>;
			after: Record<string, any>;
		}>(),
	},
	(table) => ({
		contractIndex: index("idx_audit_contract").on(table.contractId),
		userIndex: index("idx_audit_user").on(table.userId),
		actionIndex: index("idx_audit_action").on(table.action),
		timestampIndex: index("idx_audit_timestamp").on(table.timestamp),
	}),
);

// Contract Templates Table
export const contractTemplates = pgTable(
	"contract_templates",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: varchar("name", { length: 255 }).notNull(),
		type: varchar("type", { length: 50 }).notNull(),
		category: varchar("category", { length: 100 }).notNull(),
		templateContent: text("template_content").notNull(),
		variables: jsonb("variables").$type<string[]>().default([]),
		jurisdiction: varchar("jurisdiction", { length: 100 }).notNull(),
		industry: varchar("industry", { length: 100 }),
		version: varchar("version", { length: 20 }).notNull(),
		isActive: boolean("is_active").notNull().default(true),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		typeIndex: index("idx_templates_type").on(table.type),
		activeIndex: index("idx_templates_active").on(table.isActive),
	}),
);

// DocuSign Integration Config Table
export const docuSignIntegrations = pgTable("docusign_integrations", {
	id: uuid("id").primaryKey().defaultRandom(),
	accountId: uuid("account_id").notNull().unique(),
	accountEmail: varchar("account_email", { length: 255 }).notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	baseUri: varchar("base_uri", { length: 255 }).notNull(),
	integrationStatus: varchar("integration_status", { length: 50 })
		.notNull()
		.default("PENDING"),
	lastSyncAt: timestamp("last_sync_at").notNull().defaultNow(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Encrypted Contracts Table
export const encryptedContracts = pgTable(
	"encrypted_contracts",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => contracts.id, { onDelete: "cascade" }),
		encryptionAlgorithm: varchar("encryption_algorithm", {
			length: 20,
		}).notNull(), // AES-256-GCM, AES-256-CBC
		encryptedContent: text("encrypted_content").notNull(),
		iv: varchar("iv", { length: 255 }).notNull(),
		salt: varchar("salt", { length: 255 }).notNull(),
		encryptedAt: timestamp("encrypted_at").notNull().defaultNow(),
		publicKeyHash: varchar("public_key_hash", { length: 255 }).notNull(),
	},
	(table) => ({
		contractIndex: index("idx_encrypted_contract").on(table.contractId),
	}),
);

// Contract Analysis Table
export const contractAnalyses = pgTable(
	"contract_analyses",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => contracts.id, { onDelete: "cascade" }),
		analyzedAt: timestamp("analyzed_at").notNull(),
		riskLevel: varchar("risk_level", { length: 50 }).notNull(),
		riskFactors: jsonb("risk_factors")
			.$type<
				{
					factor: string;
					severity: string;
					description: string;
				}[]
			>()
			.default([]),
		legalKeywords: jsonb("legal_keywords").$type<string[]>().default([]),
		complianceChecks: jsonb("compliance_checks")
			.$type<{
				esignActCompliant: boolean;
				uetaCompliant: boolean;
				gdprCompliant: boolean;
				ccpaCompliant: boolean;
				otherRegulations: string[];
			}>()
			.default({
				esignActCompliant: false,
				uetaCompliant: false,
				gdprCompliant: false,
				ccpaCompliant: false,
				otherRegulations: [],
			}),
		suggestedImprovements: jsonb("suggested_improvements")
			.$type<string[]>()
			.default([]),
	},
	(table) => ({
		contractIndex: index("idx_analysis_contract").on(table.contractId),
	}),
);

// Contract Notifications Table
export const contractNotifications = pgTable(
	"contract_notifications",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contractId: uuid("contract_id")
			.notNull()
			.references(() => contracts.id, { onDelete: "cascade" }),
		userId: uuid("user_id").notNull(),
		type: varchar("type", { length: 50 }).notNull(),
		sentAt: timestamp("sent_at").notNull().defaultNow(),
		readAt: timestamp("read_at"),
		content: text("content").notNull(),
		actionUrl: varchar("action_url", { length: 500 }).notNull(),
	},
	(table) => ({
		userIndex: index("idx_notifications_user").on(table.userId),
		contractIndex: index("idx_notifications_contract").on(table.contractId),
	}),
);

// Contract Bulk Operations Table
export const contractBulkOperations = pgTable(
	"contract_bulk_operations",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		operationType: varchar("operation_type", { length: 50 }).notNull(),
		contractIds: jsonb("contract_ids").$type<string[]>().notNull(),
		recipientIds: jsonb("recipient_ids").$type<string[]>().notNull(),
		status: varchar("status", { length: 50 }).notNull().default("PENDING"),
		createdAt: timestamp("created_at").notNull().defaultNow(),
		completedAt: timestamp("completed_at"),
		successCount: integer("success_count").notNull().default(0),
		failureCount: integer("failure_count").notNull().default(0),
		errors: jsonb("errors")
			.$type<{ contractId: string; error: string }[]>()
			.default([]),
	},
	(table) => ({
		statusIndex: index("idx_bulk_status").on(table.status),
	}),
);
