/**
 * DocuSign Integration Service
 * Handles DocuSign envelope creation, signing, and webhook processing
 */

import axios, { type AxiosInstance } from "axios";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contracts, docuSignIntegrations } from "./schema";

interface DocuSignEnvelopeRequest {
	contractId: string;
	recipients: Array<{
		email: string;
		name: string;
		recipientId: string;
	}>;
	subject: string;
	message: string;
}

interface DocuSignEnvelopeResponse {
	envelopeId: string;
	uri: string;
	statusDateTime: string;
	status: string;
}

export class DocuSignService {
	private readonly accountId: string;
	private readonly client: AxiosInstance;

	constructor(accountId: string, baseUri: string, accessToken: string) {
		this.accountId = accountId;
		this.client = axios.create({
			baseURL: `${baseUri}/restapi/v2.1/accounts/${accountId}`,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});
	}

	/**
	 * Create DocuSign integration record
	 */
	static async setupIntegration(
		accountId: string,
		accountEmail: string,
		accessToken: string,
		refreshToken: string,
		baseUri: string,
		expiresInSeconds = 3600,
	) {
		const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

		const result = await db
			.insert(docuSignIntegrations)
			.values({
				accountId,
				accountEmail,
				accessToken,
				refreshToken,
				baseUri,
				expiresAt,
				integrationStatus: "CONNECTED",
				lastSyncAt: new Date(),
			})
			.returning();

		return result[0];
	}

	/**
	 * Get DocuSign service instance
	 */
	static async getInstance(accountId: string): Promise<DocuSignService> {
		const config = await db
			.select()
			.from(docuSignIntegrations)
			.where(eq(docuSignIntegrations.accountId, accountId))
			.limit(1);

		if (!config[0]) {
			throw new Error("DocuSign integration not configured");
		}

		const cfg = config[0];

		// Check if token needs refresh
		if (cfg.expiresAt < new Date()) {
			await DocuSignService.refreshToken(accountId);
		}

		return new DocuSignService(accountId, cfg.baseUri, cfg.accessToken);
	}

	/**
	 * Refresh DocuSign access token
	 */
	static async refreshToken(accountId: string): Promise<void> {
		const config = await db
			.select()
			.from(docuSignIntegrations)
			.where(eq(docuSignIntegrations.accountId, accountId))
			.limit(1);

		if (!config[0]) {
			throw new Error("DocuSign integration not found");
		}

		const cfg = config[0];

		try {
			const response = await axios.post(
				"https://account.docusign.com/oauth/token",
				{
					grant_type: "refresh_token",
					client_id: process.env.DOCUSIGN_CLIENT_ID,
					client_secret: process.env.DOCUSIGN_CLIENT_SECRET,
					refresh_token: cfg.refreshToken,
				},
			);

			const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);

			await db
				.update(docuSignIntegrations)
				.set({
					accessToken: response.data.access_token,
					expiresAt,
					integrationStatus: "CONNECTED",
				})
				.where(eq(docuSignIntegrations.accountId, accountId));
		} catch (error) {
			await db
				.update(docuSignIntegrations)
				.set({
					integrationStatus: "FAILED",
				})
				.where(eq(docuSignIntegrations.accountId, accountId));
			throw error;
		}
	}

	/**
	 * Send contract for signature via DocuSign
	 */
	async sendForSignature(
		request: DocuSignEnvelopeRequest,
		documentContent: string,
	): Promise<DocuSignEnvelopeResponse> {
		const signers = request.recipients.map((recipient, index) => ({
			email: recipient.email,
			name: recipient.name,
			recipientId: (index + 1).toString(),
			routingOrder: (index + 1).toString(),
		}));

		const envelope = {
			emailSubject: request.subject,
			emailBlurb: request.message,
			documents: [
				{
					documentBase64: Buffer.from(documentContent).toString("base64"),
					name: `Contract_${request.contractId}.pdf`,
					fileExtension: "pdf",
					documentId: "1",
				},
			],
			recipients: {
				signers,
			},
			status: "sent",
		};

		try {
			const response = await this.client.post("/envelopes", envelope);

			// Store envelope ID in contract
			await db
				.update(contracts)
				.set({ updatedAt: new Date() })
				.where(eq(contracts.id, request.contractId));

			return response.data as DocuSignEnvelopeResponse;
		} catch (error) {
			console.error("DocuSign envelope creation failed:", error);
			throw error;
		}
	}

	/**
	 * Get envelope status
	 */
	async getEnvelopeStatus(envelopeId: string): Promise<object> {
		const response = await this.client.get(`/envelopes/${envelopeId}`);
		return response.data;
	}

	/**
	 * Get envelope recipients and their signing status
	 */
	async getEnvelopeRecipients(envelopeId: string): Promise<object> {
		const response = await this.client.get(
			`/envelopes/${envelopeId}/recipients`,
		);
		return response.data;
	}

	/**
	 * Download signed document
	 */
	async downloadSignedDocument(
		envelopeId: string,
		documentId = "1",
	): Promise<Buffer> {
		const response = await this.client.get(
			`/envelopes/${envelopeId}/documents/${documentId}`,
			{
				responseType: "arraybuffer",
			},
		);

		return Buffer.from(response.data);
	}

	/**
	 * Get certificate of completion
	 */
	async getCertificateOfCompletion(envelopeId: string): Promise<Buffer> {
		const response = await this.client.get(
			`/envelopes/${envelopeId}/documents/combined`,
			{
				responseType: "arraybuffer",
				params: {
					certificate: true,
				},
			},
		);

		return Buffer.from(response.data);
	}

	/**
	 * Create signing link (embedded signing)
	 */
	async createSigningLink(
		envelopeId: string,
		recipientEmail: string,
		recipientName: string,
		returnUrl: string,
	): Promise<{ url: string }> {
		const response = await this.client.post(
			`/envelopes/${envelopeId}/views/recipient`,
			{
				returnUrl,
				authenticationMethod: "none",
				email: recipientEmail,
				userName: recipientName,
				clientUserId: recipientEmail,
			},
		);

		return {
			url: response.data.url,
		};
	}

	/**
	 * Process webhook event from DocuSign
	 */
	static async processWebhookEvent(event: {
		data: {
			envelopeSummary: {
				envelopeId: string;
				status: string;
				documentsUri: string;
				recipientsUri: string;
			};
		};
	}): Promise<void> {
		const { envelopeId, status } = event.data.envelopeSummary;

		// Map DocuSign status to contract status
		const statusMap: Record<string, string> = {
			sent: "PENDING_SIGNATURE",
			delivered: "PENDING_SIGNATURE",
			completed: "SIGNED",
			declined: "REJECTED",
			voided: "ARCHIVED",
		};

		const contractStatus = statusMap[status] || "DRAFT";

		// Update contract status
		// Note: You'll need to store envelopeId in contracts table to map back
		// await db.update(contracts).set({ status: contractStatus }).where(...)
	}
}

/**
 * Initialize DocuSign OAuth flow
 */
export function getDocuSignOAuthUrl(state: string): string {
	const params = new URLSearchParams({
		response_type: "code",
		scope: "signature impersonation",
		client_id: process.env.DOCUSIGN_CLIENT_ID || "",
		redirect_uri: process.env.DOCUSIGN_REDIRECT_URI || "",
		state,
	});

	return `https://account.docusign.com/oauth/auth?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeDocuSignCode(code: string): Promise<{
	accessToken: string;
	refreshToken: string;
	expiresIn: number;
	accountId: string;
	baseUri: string;
}> {
	const response = await axios.post(
		"https://account.docusign.com/oauth/token",
		{
			grant_type: "authorization_code",
			code,
			client_id: process.env.DOCUSIGN_CLIENT_ID,
			client_secret: process.env.DOCUSIGN_CLIENT_SECRET,
			redirect_uri: process.env.DOCUSIGN_REDIRECT_URI,
		},
	);

	// Get account info
	const userInfo = await axios.get("https://api.docusign.com/oauth/userinfo", {
		headers: {
			Authorization: `Bearer ${response.data.access_token}`,
		},
	});

	return {
		accessToken: response.data.access_token,
		refreshToken: response.data.refresh_token,
		expiresIn: response.data.expires_in,
		accountId: userInfo.data.accounts[0].account_id,
		baseUri: userInfo.data.accounts[0].base_uri,
	};
}
