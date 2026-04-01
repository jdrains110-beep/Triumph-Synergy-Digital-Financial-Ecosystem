/**
 * Triumph Synergy - Unified Profile Management API
 * 
 * CRUD operations for businesses, merchants, customers, employees, etc.
 * Integrates with Pi Network, NESARA/GESARA, QFS, and Allodial systems.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  profileSystem,
  commerceSystem,
  type EntityType,
  type BusinessType,
  type MerchantCategory,
  type ProfileStatus,
} from "@/lib/profiles";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      // ======================================================================
      // Profile Queries
      // ======================================================================
      
      case "profile": {
        const profileId = searchParams.get("id");
        if (!profileId) {
          return NextResponse.json(
            { success: false, error: "Profile ID required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.getProfile(profileId);
        if (!profile) {
          return NextResponse.json(
            { success: false, error: "Profile not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ success: true, data: profile });
      }

      case "individual": {
        const profileId = searchParams.get("id");
        if (!profileId) {
          return NextResponse.json(
            { success: false, error: "Profile ID required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.getIndividual(profileId);
        return NextResponse.json({ success: true, data: profile || null });
      }

      case "business": {
        const profileId = searchParams.get("id");
        if (!profileId) {
          return NextResponse.json(
            { success: false, error: "Profile ID required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.getBusiness(profileId);
        return NextResponse.json({ success: true, data: profile || null });
      }

      case "merchant": {
        const profileId = searchParams.get("id");
        if (!profileId) {
          return NextResponse.json(
            { success: false, error: "Profile ID required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.getMerchant(profileId);
        return NextResponse.json({ success: true, data: profile || null });
      }

      case "find-by-email": {
        const email = searchParams.get("email");
        if (!email) {
          return NextResponse.json(
            { success: false, error: "Email required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.findByEmail(email);
        return NextResponse.json({ success: true, data: profile });
      }

      case "find-by-pi-user": {
        const piUserId = searchParams.get("piUserId");
        if (!piUserId) {
          return NextResponse.json(
            { success: false, error: "Pi User ID required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.findByPiUserId(piUserId);
        return NextResponse.json({ success: true, data: profile });
      }

      case "find-by-phone": {
        const phone = searchParams.get("phone");
        if (!phone) {
          return NextResponse.json(
            { success: false, error: "Phone required" },
            { status: 400 }
          );
        }
        const profile = profileSystem.findByPhone(phone);
        return NextResponse.json({ success: true, data: profile });
      }

      // ======================================================================
      // Merchant Search
      // ======================================================================

      case "search-merchants": {
        const category = searchParams.get("category") as MerchantCategory | null;
        const subcategory = searchParams.get("subcategory") || undefined;
        const query = searchParams.get("query") || undefined;
        const status = searchParams.get("status") as ProfileStatus | null;
        const minRating = searchParams.get("minRating")
          ? Number.parseFloat(searchParams.get("minRating")!)
          : undefined;
        const acceptsPi = searchParams.get("acceptsPi") === "true"
          ? true
          : searchParams.get("acceptsPi") === "false"
          ? false
          : undefined;
        const limit = searchParams.get("limit")
          ? Number.parseInt(searchParams.get("limit")!)
          : undefined;

        const merchants = profileSystem.searchMerchants({
          category: category || undefined,
          subcategory,
          query,
          status: status || undefined,
          minRating,
          acceptsPi,
          limit,
        });

        return NextResponse.json({
          success: true,
          data: merchants,
          count: merchants.length,
        });
      }

      // ======================================================================
      // Business Employees
      // ======================================================================

      case "business-employees": {
        const businessId = searchParams.get("businessId");
        if (!businessId) {
          return NextResponse.json(
            { success: false, error: "Business ID required" },
            { status: 400 }
          );
        }
        const employees = profileSystem.getBusinessEmployees(businessId);
        return NextResponse.json({
          success: true,
          data: employees,
          count: employees.length,
        });
      }

      // ======================================================================
      // Statistics
      // ======================================================================

      case "statistics": {
        const profileStats = profileSystem.getStatistics();
        const commerceStats = commerceSystem.getStatistics();
        return NextResponse.json({
          success: true,
          data: {
            profiles: profileStats,
            commerce: commerceStats,
          },
        });
      }

      // ======================================================================
      // Commerce - Products
      // ======================================================================

      case "products": {
        const merchantId = searchParams.get("merchantId") || undefined;
        const category = searchParams.get("category") as MerchantCategory | null;
        const query = searchParams.get("query") || undefined;
        const minPrice = searchParams.get("minPrice")
          ? Number.parseFloat(searchParams.get("minPrice")!)
          : undefined;
        const maxPrice = searchParams.get("maxPrice")
          ? Number.parseFloat(searchParams.get("maxPrice")!)
          : undefined;
        const inStock = searchParams.get("inStock") === "true"
          ? true
          : searchParams.get("inStock") === "false"
          ? false
          : undefined;
        const limit = searchParams.get("limit")
          ? Number.parseInt(searchParams.get("limit")!)
          : undefined;

        const products = commerceSystem.searchProducts({
          merchantId,
          category: category || undefined,
          query,
          minPrice,
          maxPrice,
          inStock,
          limit,
        });

        return NextResponse.json({
          success: true,
          data: products,
          count: products.length,
        });
      }

      // ======================================================================
      // Commerce - Orders
      // ======================================================================

      case "orders": {
        const buyerId = searchParams.get("buyerId") || undefined;
        const sellerId = searchParams.get("sellerId") || undefined;
        const status = searchParams.get("status") || undefined;
        const limit = searchParams.get("limit")
          ? Number.parseInt(searchParams.get("limit")!)
          : undefined;

        const orders = commerceSystem.getOrders({
          buyerId,
          sellerId,
          status: status as any,
          limit,
        });

        return NextResponse.json({
          success: true,
          data: orders,
          count: orders.length,
        });
      }

      // ======================================================================
      // Commerce - Reviews
      // ======================================================================

      case "reviews": {
        const targetId = searchParams.get("targetId");
        if (!targetId) {
          return NextResponse.json(
            { success: false, error: "Target ID required" },
            { status: 400 }
          );
        }
        const status = searchParams.get("status") as any;
        const reviews = commerceSystem.getReviews(targetId, status);
        const rating = commerceSystem.calculateAverageRating(targetId);

        return NextResponse.json({
          success: true,
          data: {
            reviews,
            rating,
          },
        });
      }

      // ======================================================================
      // Default - API Info
      // ======================================================================

      default:
        return NextResponse.json({
          success: true,
          message: "Triumph Synergy Profile & Commerce API",
          version: "1.0.0",
          endpoints: {
            GET: {
              "?action=profile&id=": "Get any profile by ID",
              "?action=individual&id=": "Get individual profile",
              "?action=business&id=": "Get business profile",
              "?action=merchant&id=": "Get merchant profile",
              "?action=find-by-email&email=": "Find by email",
              "?action=find-by-pi-user&piUserId=": "Find by Pi user ID",
              "?action=find-by-phone&phone=": "Find by phone",
              "?action=search-merchants": "Search merchants",
              "?action=business-employees&businessId=": "Get business employees",
              "?action=statistics": "Get system statistics",
              "?action=products": "Search products",
              "?action=orders": "Get orders",
              "?action=reviews&targetId=": "Get reviews",
            },
            POST: {
              "create-individual": "Create individual profile",
              "create-customer": "Create customer profile",
              "create-employee": "Create employee profile",
              "create-freelancer": "Create freelancer profile",
              "create-business": "Create business profile",
              "create-merchant": "Create merchant profile",
              "create-vendor": "Create vendor profile",
              "create-service-provider": "Create service provider profile",
              "verify-pi-kyc": "Verify with Pi KYC",
              "link-nesara": "Link NESARA profile",
              "link-qfs": "Link QFS account",
              "link-citizen": "Link citizen profile",
              "link-allodial": "Link allodial portfolio",
              "link-pi-wallet": "Link Pi wallet",
              "update-status": "Update profile status",
              "enable-2fa": "Enable two-factor auth",
              "add-owner": "Add business owner",
              "add-employee": "Add employee to business",
              "create-product": "Create product",
              "create-order": "Create order",
              "process-payment": "Process payment",
              "ship-order": "Ship order",
              "complete-order": "Complete order",
              "create-review": "Create review",
            },
          },
        });
    }
  } catch (error) {
    console.error("Profile API GET error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      // ======================================================================
      // Individual Profile Creation
      // ======================================================================

      case "create-individual": {
        const profile = profileSystem.createIndividualProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: new Date(data.dateOfBirth),
          address: data.address,
          entityType: data.entityType,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      case "create-customer": {
        const profile = profileSystem.createCustomerProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: new Date(data.dateOfBirth),
          address: data.address,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      case "create-employee": {
        const profile = profileSystem.createEmployeeProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: new Date(data.dateOfBirth),
          address: data.address,
          employerId: data.employerId,
          employerName: data.employerName,
          position: data.position,
          department: data.department,
          salary: data.salary,
          salaryFrequency: data.salaryFrequency,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      case "create-freelancer": {
        const profile = profileSystem.createFreelancerProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          middleName: data.middleName,
          email: data.email,
          phone: data.phone,
          dateOfBirth: new Date(data.dateOfBirth),
          address: data.address,
          skills: data.skills,
          hourlyRate: data.hourlyRate,
          availability: data.availability,
          portfolio: data.portfolio,
          certifications: data.certifications,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      // ======================================================================
      // Business Profile Creation
      // ======================================================================

      case "create-business": {
        const profile = profileSystem.createBusinessProfile({
          legalName: data.legalName,
          tradeName: data.tradeName,
          businessType: data.businessType as BusinessType,
          description: data.description,
          email: data.email,
          phone: data.phone,
          address: data.address,
          website: data.website,
          ein: data.ein,
          incorporationState: data.incorporationState,
          incorporationDate: data.incorporationDate ? new Date(data.incorporationDate) : undefined,
          primaryOwner: data.primaryOwner,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      // ======================================================================
      // Merchant Profile Creation
      // ======================================================================

      case "create-merchant": {
        const profile = profileSystem.createMerchantProfile({
          merchantName: data.merchantName,
          description: data.description,
          category: data.category as MerchantCategory,
          subcategories: data.subcategories,
          email: data.email,
          phone: data.phone,
          address: data.address,
          businessProfileId: data.businessProfileId,
          storeType: data.storeType,
          storeUrl: data.storeUrl,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      case "create-vendor": {
        const profile = profileSystem.createVendorProfile({
          merchantName: data.merchantName,
          description: data.description,
          category: data.category as MerchantCategory,
          subcategories: data.subcategories,
          email: data.email,
          phone: data.phone,
          address: data.address,
          businessProfileId: data.businessProfileId,
          storeType: data.storeType,
          storeUrl: data.storeUrl,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      case "create-service-provider": {
        const profile = profileSystem.createServiceProviderProfile({
          merchantName: data.merchantName,
          description: data.description,
          category: data.category as MerchantCategory,
          subcategories: data.subcategories,
          email: data.email,
          phone: data.phone,
          address: data.address,
          businessProfileId: data.businessProfileId,
          storeType: data.storeType,
          storeUrl: data.storeUrl,
          piUserId: data.piUserId,
          piUsername: data.piUsername,
        });
        return NextResponse.json({ success: true, data: profile }, { status: 201 });
      }

      // ======================================================================
      // Verification & Linking
      // ======================================================================

      case "verify-pi-kyc": {
        const success = profileSystem.verifyWithPiKYC(data.profileId);
        return NextResponse.json({ success, data: { verified: success } });
      }

      case "upgrade-verification": {
        const success = profileSystem.upgradeVerification(
          data.profileId,
          data.level,
          data.reason
        );
        return NextResponse.json({ success });
      }

      case "link-nesara": {
        profileSystem.linkNESARAProfile(data.profileId, data.nesaraProfileId);
        return NextResponse.json({ success: true });
      }

      case "link-qfs": {
        profileSystem.linkQFSAccount(data.profileId, data.qfsAccountId);
        return NextResponse.json({ success: true });
      }

      case "link-citizen": {
        profileSystem.linkCitizenProfile(data.profileId, data.citizenProfileId);
        return NextResponse.json({ success: true });
      }

      case "link-allodial": {
        profileSystem.linkAllodialPortfolio(data.profileId, data.portfolioId);
        return NextResponse.json({ success: true });
      }

      case "link-pi-wallet": {
        profileSystem.linkPiWallet(
          data.profileId,
          data.piUserId,
          data.piUsername,
          data.walletAddress
        );
        return NextResponse.json({ success: true });
      }

      // ======================================================================
      // Security
      // ======================================================================

      case "update-status": {
        profileSystem.updateStatus(data.profileId, data.status, data.reason);
        return NextResponse.json({ success: true });
      }

      case "enable-2fa": {
        const result = profileSystem.enableTwoFactor(data.profileId);
        return NextResponse.json({ success: true, data: result });
      }

      case "record-login": {
        profileSystem.recordLoginAttempt(data.profileId, data.success, data.ipAddress);
        return NextResponse.json({ success: true });
      }

      // ======================================================================
      // Business Management
      // ======================================================================

      case "add-owner": {
        const business = profileSystem.addBusinessOwner(data.businessId, data.owner);
        return NextResponse.json({ success: true, data: business });
      }

      case "add-authorized-rep": {
        const business = profileSystem.addAuthorizedRep(data.businessId, data.rep);
        return NextResponse.json({ success: true, data: business });
      }

      case "add-employee": {
        profileSystem.addEmployee(
          data.businessId,
          data.employeeProfileId,
          data.department,
          data.position
        );
        return NextResponse.json({ success: true });
      }

      // ======================================================================
      // Commerce - Products
      // ======================================================================

      case "create-product": {
        const product = commerceSystem.createProduct({
          merchantId: data.merchantId,
          name: data.name,
          description: data.description,
          category: data.category as MerchantCategory,
          subcategory: data.subcategory,
          price: data.price,
          currency: data.currency,
          inventoryType: data.inventoryType,
          stockQuantity: data.stockQuantity,
          sku: data.sku,
          images: data.images,
          attributes: data.attributes,
          weight: data.weight,
          dimensions: data.dimensions,
        });
        return NextResponse.json({ success: true, data: product }, { status: 201 });
      }

      case "update-product": {
        const product = commerceSystem.updateProduct(data.productId, data.updates);
        return NextResponse.json({ success: true, data: product });
      }

      case "publish-product": {
        const product = commerceSystem.publishProduct(data.productId);
        return NextResponse.json({ success: true, data: product });
      }

      // ======================================================================
      // Commerce - Services
      // ======================================================================

      case "create-service": {
        const service = commerceSystem.createService({
          providerId: data.providerId,
          name: data.name,
          description: data.description,
          category: data.category as MerchantCategory,
          priceType: data.priceType,
          price: data.price,
          currency: data.currency,
          estimatedDuration: data.estimatedDuration,
          availability: data.availability,
          requirements: data.requirements,
          deliverables: data.deliverables,
        });
        return NextResponse.json({ success: true, data: service }, { status: 201 });
      }

      // ======================================================================
      // Commerce - Orders
      // ======================================================================

      case "create-order": {
        const order = commerceSystem.createOrder({
          buyerId: data.buyerId,
          buyerName: data.buyerName,
          buyerEmail: data.buyerEmail,
          sellerId: data.sellerId,
          sellerName: data.sellerName,
          items: data.items,
          paymentMethod: data.paymentMethod,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          customerNotes: data.customerNotes,
          currency: data.currency,
        });
        return NextResponse.json({ success: true, data: order }, { status: 201 });
      }

      case "process-payment": {
        const order = commerceSystem.processPayment(data.orderId, {
          paymentId: data.paymentId,
          piPaymentId: data.piPaymentId,
          qfsTransactionId: data.qfsTransactionId,
          amount: data.amount,
        });
        return NextResponse.json({ success: true, data: order });
      }

      case "ship-order": {
        const order = commerceSystem.shipOrder(data.orderId, {
          trackingNumber: data.trackingNumber,
          shippingMethod: data.shippingMethod,
          estimatedDelivery: data.estimatedDelivery
            ? new Date(data.estimatedDelivery)
            : undefined,
        });
        return NextResponse.json({ success: true, data: order });
      }

      case "mark-delivered": {
        const order = commerceSystem.markDelivered(data.orderId);
        return NextResponse.json({ success: true, data: order });
      }

      case "complete-order": {
        const order = commerceSystem.completeOrder(data.orderId);
        return NextResponse.json({ success: true, data: order });
      }

      case "cancel-order": {
        const order = commerceSystem.cancelOrder(data.orderId, data.reason);
        return NextResponse.json({ success: true, data: order });
      }

      case "refund-order": {
        const order = commerceSystem.refundOrder(
          data.orderId,
          data.amount,
          data.reason
        );
        return NextResponse.json({ success: true, data: order });
      }

      // ======================================================================
      // Commerce - Escrow
      // ======================================================================

      case "create-escrow": {
        const escrow = commerceSystem.createEscrow({
          orderId: data.orderId,
          buyerId: data.buyerId,
          sellerId: data.sellerId,
          amount: data.amount,
          currency: data.currency,
          releaseConditions: data.releaseConditions,
          autoReleaseDate: data.autoReleaseDate
            ? new Date(data.autoReleaseDate)
            : undefined,
        });
        return NextResponse.json({ success: true, data: escrow }, { status: 201 });
      }

      case "mark-condition-met": {
        const escrow = commerceSystem.markConditionMet(
          data.escrowId,
          data.conditionIndex
        );
        return NextResponse.json({ success: true, data: escrow });
      }

      // ======================================================================
      // Commerce - Disputes
      // ======================================================================

      case "create-dispute": {
        const dispute = commerceSystem.createDispute({
          orderId: data.orderId,
          raisedBy: data.raisedBy,
          respondent: data.respondent,
          reason: data.reason,
          description: data.description,
          evidence: data.evidence,
        });
        return NextResponse.json({ success: true, data: dispute }, { status: 201 });
      }

      case "add-dispute-message": {
        const dispute = commerceSystem.addDisputeMessage(
          data.disputeId,
          data.senderId,
          data.message,
          data.attachments
        );
        return NextResponse.json({ success: true, data: dispute });
      }

      case "resolve-dispute": {
        const dispute = commerceSystem.resolveDispute(data.disputeId, {
          outcome: data.outcome,
          notes: data.notes,
          refundAmount: data.refundAmount,
        });
        return NextResponse.json({ success: true, data: dispute });
      }

      // ======================================================================
      // Commerce - Reviews
      // ======================================================================

      case "create-review": {
        const review = commerceSystem.createReview({
          orderId: data.orderId,
          reviewerId: data.reviewerId,
          reviewerName: data.reviewerName,
          targetId: data.targetId,
          targetType: data.targetType,
          overallRating: data.overallRating,
          qualityRating: data.qualityRating,
          serviceRating: data.serviceRating,
          valueRating: data.valueRating,
          title: data.title,
          content: data.content,
          pros: data.pros,
          cons: data.cons,
          images: data.images,
        });
        return NextResponse.json({ success: true, data: review }, { status: 201 });
      }

      case "publish-review": {
        const review = commerceSystem.publishReview(data.reviewId);
        return NextResponse.json({ success: true, data: review });
      }

      case "respond-to-review": {
        const review = commerceSystem.respondToReview(data.reviewId, data.response);
        return NextResponse.json({ success: true, data: review });
      }

      // ======================================================================
      // Commerce - Invoices
      // ======================================================================

      case "create-invoice": {
        const invoice = commerceSystem.createInvoice({
          issuerId: data.issuerId,
          issuerName: data.issuerName,
          recipientId: data.recipientId,
          recipientName: data.recipientName,
          items: data.items,
          dueDate: new Date(data.dueDate),
          orderId: data.orderId,
          terms: data.terms,
          currency: data.currency,
        });
        return NextResponse.json({ success: true, data: invoice }, { status: 201 });
      }

      case "send-invoice": {
        const invoice = commerceSystem.sendInvoice(data.invoiceId);
        return NextResponse.json({ success: true, data: invoice });
      }

      case "record-invoice-payment": {
        const invoice = commerceSystem.recordInvoicePayment(
          data.invoiceId,
          data.amount
        );
        return NextResponse.json({ success: true, data: invoice });
      }

      // ======================================================================
      // Default
      // ======================================================================

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Profile API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
