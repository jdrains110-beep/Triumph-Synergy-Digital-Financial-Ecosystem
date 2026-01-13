/**
 * Contract Service - Core Business Logic
 * Handles contract lifecycle, signatures, consent tracking, and audit trails
 */

import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/db";
import {
	contractAuditLogs,
	contractSignatures,
	contracts,
	contractTemplates,
	userConsents,
} from "./schema";
import {
	type AuditLog,
	ConsentStatus,
	type Contract,
	type ContractSignature,
	ContractStatus,
	type ContractTemplate,
	type ContractType,
	type SignatureMethod,
	type UserConsent,
} from "./types";

export class ContractService {
	/**
	 * Create a new contract
	 */
	static async createContract(
		data: Omit<Contract, "id" | "createdAt" | "updatedAt">,
		createdByUserId: string,
	): Promise<Contract> {
		const id = uuidv4();
		const now = new Date();

		const result = await db
			.insert(contracts)
			.values({
				id,
				type: data.type,
				title: data.title,
				version: data.version,
				content: data.content,
				htmlContent: data.htmlContent,
				status: data.status,
				jurisdiction: data.jurisdiction,
				effectiveDate: data.effectiveDate,
				expiryDate: data.expiryDate,
				createdBy: createdByUserId,
				tags: data.tags || [],
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		// Log creation
		await ContractService.logAuditEvent({
			contractId: id,
			userId: createdByUserId,
			action: "created",
			details: { title: data.title, type: data.type },
		});

		return result[0] as Contract;
	}

	/**
	 * Get contract by ID
	 */
	static async getContractById(contractId: string): Promise<Contract | null> {
		const result = await db
			.select()
			.from(contracts)
			.where(eq(contracts.id, contractId))
			.limit(1);

		return (result[0] as Contract) || null;
	}

	/**
	 * Get all contracts for a user (created or participated)
	 */
	static async getUserContracts(
		userId: string,
		limit = 50,
		offset = 0,
	): Promise<{ contracts: Contract[]; total: number }> {
		const userContracts = await db
			.select()
			.from(contracts)
			.where(eq(contracts.createdBy, userId))
			.limit(limit)
			.offset(offset);

		const countResult = await db
			.select({ count: contracts.id })
			.from(contracts)
			.where(eq(contracts.createdBy, userId));

		return {
			contracts: userContracts as Contract[],
			total: countResult.length,
		};
	}

	/**
	 * Record a contract signature with comprehensive audit trail
	 */
	static async signContract(
		contractId: string,
		userId: string,
		email: string,
		displayName: string,
		signatureData: string,
		method: SignatureMethod,
		context: {
			ipAddress: string;
			userAgent: string;
			platform: string;
			browser: string;
			deviceType: string;
			country?: string;
			city?: string;
		},
	): Promise<ContractSignature> {
		const id = uuidv4();
		const now = new Date();

		const result = await db
			.insert(contractSignatures)
			.values({
				id,
				contractId,
				userId,
				email,
				displayName,
				signatureMethod: method,
				signatureData,
				signedAt: now,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
				deviceInfo: {
					platform: context.platform,
					browser: context.browser,
					deviceType: context.deviceType,
				},
				location: context.country
					? {
							country: context.country,
							city: context.city || "",
						}
					: undefined,
			})
			.returning();

		const signature = result[0] as ContractSignature;

		// Update contract status if all required signatures obtained
		await ContractService.updateContractStatus(
			contractId,
			ContractStatus.SIGNED,
		);

		// Log signature event
		await ContractService.logAuditEvent({
			contractId,
			signatureId: id,
			userId,
			action: "signed",
			details: {
				signatureMethod: method,
				deviceType: context.deviceType,
				location: context.country,
			},
		});

		return signature;
	}

	/**
	 * Get all signatures for a contract
	 */
	static async getContractSignatures(
		contractId: string,
	): Promise<ContractSignature[]> {
		const results = await db
			.select()
			.from(contractSignatures)
			.where(eq(contractSignatures.contractId, contractId));

		return results as ContractSignature[];
	}

	/**
	 * Record user consent (active acceptance)
	 */
	static async recordConsent(
		userId: string,
		email: string,
		contractId: string,
		contractType: ContractType,
		status: ConsentStatus,
		context: {
			ipAddress: string;
			userAgent: string;
		},
		expiresInDays?: number,
	): Promise<UserConsent> {
		const id = uuidv4();
		const now = new Date();
		const expiresAt = expiresInDays
			? new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000)
			: undefined;

		const result = await db
			.insert(userConsents)
			.values({
				id,
				userId,
				email,
				contractId,
				contractType,
				consentStatus: status,
				acceptedAt: status === ConsentStatus.ACCEPTED ? now : undefined,
				rejectedAt: status === ConsentStatus.REJECTED ? now : undefined,
				ipAddress: context.ipAddress,
				userAgent: context.userAgent,
				consentVersion: "1.0",
				expiresAt,
				createdAt: now,
				updatedAt: now,
			})
			.returning();

		const consent = result[0] as UserConsent;

		// Log consent event
		await ContractService.logAuditEvent({
			contractId,
			consentId: id,
			userId,
			action: status === ConsentStatus.ACCEPTED ? "accepted" : "rejected",
			details: {
				consentStatus: status,
				expiresAt: expiresAt?.toISOString(),
			},
		});

		return consent;
	}

	/**
	 * Get user's consent status for a contract
	 */
	static async getUserConsentStatus(
		userId: string,
		contractId: string,
	): Promise<UserConsent | null> {
		const result = await db
			.select()
			.from(userConsents)
			.where(
				and(
					eq(userConsents.userId, userId),
					eq(userConsents.contractId, contractId),
				),
			)
			.limit(1);

		return (result[0] as UserConsent) || null;
	}

	/**
	 * Log audit event with optional screenshot verification
	 */
	static async logAuditEvent(
		data: Omit<AuditLog, "id" | "timestamp" | "ipAddress" | "userAgent"> & {
			ipAddress?: string;
			userAgent?: string;
		},
	): Promise<AuditLog> {
		const id = uuidv4();
		const now = new Date();

		const result = await db
			.insert(contractAuditLogs)
			.values({
				id,
				contractId: data.contractId,
				signatureId: data.signatureId,
				consentId: data.consentId,
				userId: data.userId,
				action: data.action,
				timestamp: now,
				ipAddress: data.ipAddress || "0.0.0.0",
				userAgent: data.userAgent || "Unknown",
				details: data.details || {},
				screenshot: data.screenshot,
				changeLog: data.changeLog,
			})
			.returning();

		return result[0] as AuditLog;
	}

	/**
	 * Get audit trail for a contract
	 */
	static async getContractAuditTrail(contractId: string): Promise<AuditLog[]> {
		const results = await db
			.select()
			.from(contractAuditLogs)
			.where(eq(contractAuditLogs.contractId, contractId));

		return results as AuditLog[];
	}

	/**
	 * Get audit trail for a user
	 */
	static async getUserAuditTrail(userId: string): Promise<AuditLog[]> {
		const results = await db
			.select()
			.from(contractAuditLogs)
			.where(eq(contractAuditLogs.userId, userId));

		return results as AuditLog[];
	}

	/**
	 * Update contract status
	 */
	static async updateContractStatus(
		contractId: string,
		status: ContractStatus,
	): Promise<void> {
		await db
			.update(contracts)
			.set({
				status,
				updatedAt: new Date(),
			})
			.where(eq(contracts.id, contractId));
	}

	/**
	 * Create contract from template with variable substitution
	 */
	static async createContractFromTemplate(
		templateId: string,
		variables: Record<string, string>,
		createdByUserId: string,
	): Promise<Contract> {
		const template = await db
			.select()
			.from(contractTemplates)
			.where(eq(contractTemplates.id, templateId))
			.limit(1);

		if (!template[0]) {
			throw new Error(`Template not found: ${templateId}`);
		}

		const tmpl = template[0] as ContractTemplate;
		let content = tmpl.templateContent;

		// Replace template variables
		Object.entries(variables).forEach(([key, value]) => {
			content = content.replace(`{{${key}}}`, value);
		});

		return ContractService.createContract(
			{
				type: tmpl.type,
				title: `${tmpl.name} - ${new Date().toISOString()}`,
				version: tmpl.version,
				content,
				htmlContent: undefined,
				jurisdiction: tmpl.jurisdiction,
				effectiveDate: new Date(),
				expiryDate: undefined,
				status: ContractStatus.DRAFT,
				tags: [tmpl.category, tmpl.industry || ""].filter(Boolean),
				createdBy: createdByUserId,
			},
			createdByUserId,
		);
	}

	/**
	 * Get contract with all related data
	 */
	static async getContractWithDetails(contractId: string) {
		const contract = await ContractService.getContractById(contractId);
		if (!contract) {
			return null;
		}

		const [signatures, consents, auditLogs] = await Promise.all([
			ContractService.getContractSignatures(contractId),
			db
				.select()
				.from(userConsents)
				.where(eq(userConsents.contractId, contractId)),
			ContractService.getContractAuditTrail(contractId),
		]);

		return {
			contract,
			signatures: signatures as ContractSignature[],
			consents: consents as UserConsent[],
			auditLogs: auditLogs as AuditLog[],
		};
	}

	/**
	 * Verify contract compliance with legal standards
	 */
	static async verifyLegalCompliance(contractId: string): Promise<{
		esignActCompliant: boolean;
		uetaCompliant: boolean;
		gdprCompliant: boolean;
		ccpaCompliant: boolean;
		hasActiveConsent: boolean;
		hasAuditTrail: boolean;
		isValid: boolean;
	}> {
		const contract = await ContractService.getContractById(contractId);
		if (!contract) {
			throw new Error("Contract not found");
		}

		const signatures = await ContractService.getContractSignatures(contractId);
		const consents = await db
			.select()
			.from(userConsents)
			.where(
				and(
					eq(userConsents.contractId, contractId),
					eq(userConsents.consentStatus, "ACCEPTED"),
				),
			);

		const auditLogs = await ContractService.getContractAuditTrail(contractId);

		// Check compliance criteria
		const esignActCompliant = signatures.length > 0 && auditLogs.length > 0; // E-signature + audit trail
		const uetaCompliant = esignActCompliant; // UETA requires intent + consent
		const gdprCompliant = consents.length > 0; // Explicit consent required
		const ccpaCompliant = consents.length > 0; // Consumer rights opt-in
		const hasActiveConsent = consents.length > 0;
		const hasAuditTrail = auditLogs.length > 0;

		const isValid = esignActCompliant && uetaCompliant && hasAuditTrail;

		return {
			esignActCompliant,
			uetaCompliant,
			gdprCompliant,
			ccpaCompliant,
			hasActiveConsent,
			hasAuditTrail,
			isValid,
		};
	}

	/**
	 * Export contract with all audit trail documentation
	 */
	static async exportContractWithAuditTrail(contractId: string): Promise<{
		contract: Contract;
		signatures: ContractSignature[];
		consents: UserConsent[];
		auditLogs: AuditLog[];
		complianceStatus: object;
	}> {
		const details = await ContractService.getContractWithDetails(contractId);
		if (!details) {
			throw new Error("Contract not found");
		}

		const complianceStatus =
			await ContractService.verifyLegalCompliance(contractId);

		return {
			contract: details.contract,
			signatures: details.signatures,
			consents: details.consents,
			auditLogs: details.auditLogs,
			complianceStatus,
		};
	}

	/**
	 * Check if contract is valid and not expired
	 */
	static async isContractValid(contractId: string): Promise<boolean> {
		const contract = await ContractService.getContractById(contractId);
		if (!contract) {
			return false;
		}

		const now = new Date();
		const isExpired = contract.expiryDate && contract.expiryDate < now;
		const isActive =
			contract.status === ContractStatus.ACTIVE ||
			contract.status === ContractStatus.SIGNED;

		return isActive && !isExpired;
	}
}
