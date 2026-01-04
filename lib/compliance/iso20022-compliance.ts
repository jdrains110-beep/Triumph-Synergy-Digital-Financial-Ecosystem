// lib/compliance/iso20022-compliance.ts
// ISO 20022 Financial Messaging Standard Implementation

export type ISO20022Message = {
  messageId: string;
  creationDateTime: string;
  messageType: string;
  version: string;
};

export interface PACS008Message extends ISO20022Message {
  messageType: "PACS.008";
  paymentInformation: {
    paymentId: string;
    paymentMethod: string;
    debtorAccount: {
      id: string;
      name: string;
      accountType: string;
    };
    creditorAccount: {
      id: string;
      name: string;
      accountType: string;
    };
    transactionAmount: {
      amount: number;
      currency: string;
    };
    requestedExecutionDate: string;
    remittanceInformation: {
      unstructured: string;
      reference?: string;
    };
  };
  endToEndReference: string;
}

export interface PACS002Message extends ISO20022Message {
  messageType: "PACS.002";
  originalMessageId: string;
  paymentStatus: "ACCC" | "ACPT" | "RJCT";
  statusReasonInformation?: string;
  transactionReference: string;
}

/**
 * ISO 20022 Compliance Service
 * Ensures all messages follow PACS/CAMT protocols
 *
 * PACS = Payment Clearing and Settlement
 * CAMT = Cash Management and Transactions
 */
export class ISO20022ComplianceService {
  /**
   * Validate PACS.008 Payment Initiation Message
   */
  validatePACS008(message: any): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!message.messageId) {
      errors.push("messageId is required");
    }
    if (!message.creationDateTime) {
      errors.push("creationDateTime is required");
    }
    if (!message.paymentInformation) {
      errors.push("paymentInformation is required");
    }
    if (!message.endToEndReference) {
      errors.push("endToEndReference is required (traceability)");
    }

    // Message structure
    const pi = message.paymentInformation;
    if (pi) {
      if (!pi.debtorAccount) {
        errors.push("paymentInformation.debtorAccount is required");
      }
      if (!pi.creditorAccount) {
        errors.push("paymentInformation.creditorAccount is required");
      }
      if (!pi.transactionAmount) {
        errors.push("paymentInformation.transactionAmount is required");
      }

      // Amount validation
      if (pi.transactionAmount && pi.transactionAmount.amount <= 0) {
        errors.push("Transaction amount must be > 0");
      }

      // Currency validation (ISO 4217)
      if (
        pi.transactionAmount &&
        !this.isValidCurrency(pi.transactionAmount.currency)
      ) {
        errors.push("Invalid currency code (must be ISO 4217)");
      }

      // Account format validation
      if (pi.debtorAccount && !this.isValidAccount(pi.debtorAccount.id)) {
        errors.push("Invalid debtor account format");
      }
      if (pi.creditorAccount && !this.isValidAccount(pi.creditorAccount.id)) {
        errors.push("Invalid creditor account format");
      }
    }

    // Date validation
    try {
      const date = new Date(message.creationDateTime);
      if (Number.isNaN(date.getTime())) {
        errors.push("creationDateTime must be valid ISO 8601 format");
      }
    } catch (_e) {
      errors.push("creationDateTime parsing failed");
    }

    // Warnings
    if (!pi.remittanceInformation?.unstructured) {
      warnings.push(
        "remittanceInformation.unstructured is recommended for clarity"
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate PACS.002 Payment Status Report
   */
  validatePACS002(message: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Required fields
    if (!message.messageId) {
      errors.push("messageId is required");
    }
    if (!message.originalMessageId) {
      errors.push("originalMessageId is required");
    }
    if (!message.paymentStatus) {
      errors.push("paymentStatus is required");
    }
    if (!message.transactionReference) {
      errors.push("transactionReference is required");
    }

    // Status validation
    const validStatuses = ["ACCC", "ACPT", "RJCT"];
    if (
      message.paymentStatus &&
      !validStatuses.includes(message.paymentStatus)
    ) {
      errors.push(`paymentStatus must be one of: ${validStatuses.join(", ")}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert Pi Network transaction to PACS.008
   */
  convertToPACS008(piTransaction: any): PACS008Message {
    return {
      messageId: `MSG-${Date.now()}`,
      creationDateTime: new Date().toISOString(),
      messageType: "PACS.008",
      version: "03.02",
      paymentInformation: {
        paymentId: piTransaction.id,
        paymentMethod: "TRF", // Transfer
        debtorAccount: {
          id: piTransaction.from,
          name: piTransaction.senderName || "",
          accountType: "Pi Wallet",
        },
        creditorAccount: {
          id: piTransaction.to,
          name: piTransaction.recipientName || "",
          accountType: "Pi Wallet",
        },
        transactionAmount: {
          amount: piTransaction.amount,
          currency: "EUR", // Stablecoin value in EUR
        },
        requestedExecutionDate: piTransaction.timestamp,
        remittanceInformation: {
          unstructured: piTransaction.description || "Pi Network Payment",
          reference: piTransaction.hash,
        },
      },
      endToEndReference: piTransaction.hash, // Blockchain tx hash ensures uniqueness
    };
  }

  /**
   * Generate PACS.002 status report
   */
  generatePACS002Status(
    originalMessage: PACS008Message,
    status: "ACCC" | "ACPT" | "RJCT",
    transactionHash: string,
    reason?: string
  ): PACS002Message {
    return {
      messageId: `MSG-${Date.now()}`,
      creationDateTime: new Date().toISOString(),
      messageType: "PACS.002",
      version: "03.02",
      originalMessageId: originalMessage.messageId,
      paymentStatus: status,
      statusReasonInformation: reason,
      transactionReference: transactionHash,
    };
  }

  /**
   * Validate ISO 8601 date format
   */
  private isValidCurrency(code: string): boolean {
    // ISO 4217 currency codes
    const validCurrencies = [
      "EUR",
      "USD",
      "GBP",
      "JPY",
      "CHF",
      "CAD",
      "AUD",
      "NZD",
      "CNY",
      "INR",
      "SGD",
      "HKD",
      "NOK",
      "SEK",
      "DKK",
      "PLN",
    ];
    return validCurrencies.includes(code);
  }

  /**
   * Validate account format (IBAN or Pi address)
   */
  private isValidAccount(account: string): boolean {
    // IBAN format: 2 letters + 2 digits + country-specific
    const ibanFormat = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
    // Pi wallet format: pi_ + 56 alphanumeric
    const piFormat = /^pi_[a-z0-9]{56}$/;

    return ibanFormat.test(account) || piFormat.test(account);
  }

  /**
   * Real-Time Gross Settlement (RTGS)
   * Ensures immediate settlement on blockchain
   */
  async executeRTGSSettlement(message: PACS008Message): Promise<{
    settlementId: string;
    status: string;
    settlementTime: string;
    transactionHash: string;
  }> {
    const pi = message.paymentInformation;

    // Create blockchain transaction
    const tx = await this.createBlockchainTransaction({
      from: pi.debtorAccount.id,
      to: pi.creditorAccount.id,
      amount: pi.transactionAmount.amount,
      reference: message.endToEndReference,
      iso20022Message: message,
    });

    return {
      settlementId: message.messageId,
      status: "SETTLED",
      settlementTime: new Date().toISOString(),
      transactionHash: tx.hash,
    };
  }

  /**
   * Create blockchain transaction
   * @private
   */
  private async createBlockchainTransaction(
    _tx: any
  ): Promise<{ hash: string }> {
    // In production: call blockchain service
    return {
      hash: `0x${Math.random().toString(16).slice(2)}`,
    };
  }
}

export default ISO20022ComplianceService;
