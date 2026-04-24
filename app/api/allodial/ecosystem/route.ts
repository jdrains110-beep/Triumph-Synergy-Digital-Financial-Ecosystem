/**
 * Unified Ecosystem Integration API
 * 
 * Provides a single endpoint to:
 * - Register citizens with full ecosystem integration
 * - Create complete profiles across all systems
 * - Process comprehensive benefit applications
 * 
 * @route /api/allodial/ecosystem
 */

import { NextRequest, NextResponse } from "next/server";
import { allodialSystem, citizenSystem } from "@/lib/allodial";
import { 
  qfs, 
  birthBondSystem, 
  nesaraEngine, 
  restitutionSystem,
  gesaraCompliance 
} from "@/lib/nesara";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "full-registration": {
        const {
          // Personal details
          legalName,
          firstName,
          middleName,
          lastName,
          dateOfBirth,
          placeOfBirth,
          countyOfBirth,
          stateOfBirth,
          countryOfBirth,
          birthCertificateNumber,
          ssn,
          // Address
          streetAddress,
          city,
          state,
          postalCode,
          country,
          // Pi Network
          piWalletId,
        } = params;

        if (!legalName || !firstName || !lastName || !dateOfBirth || !birthCertificateNumber) {
          return NextResponse.json(
            { error: "Required fields: legalName, firstName, lastName, dateOfBirth, birthCertificateNumber" },
            { status: 400 }
          );
        }

        const birthDate = new Date(dateOfBirth);
        const birthYear = birthDate.getFullYear();

        // 1. Create Citizen Profile
        const citizen = citizenSystem.registerCitizen({
          legalName,
          firstName,
          middleName,
          lastName,
          dateOfBirth: birthDate,
          placeOfBirth: placeOfBirth || city,
          countyOfBirth: countyOfBirth || "",
          stateOfBirth: stateOfBirth || state,
          countryOfBirth: countryOfBirth || "USA",
          birthCertificateNumber,
          mailingAddress: {
            streetAddress,
            city,
            state,
            postalCode,
            country: country || "USA",
          },
        });

        // 2. Create NESARA Profile
        const nesaraProfile = await nesaraEngine.registerForNESARA(
          citizen.id,
          legalName
        );

        // 3. Create QFS Account
        const qfsAccount = await qfs.createAccount({
          type: "individual",
          holder: {
            id: citizen.id,
            name: citizen.commonLawName,
            piUserId: piWalletId,
            countryCode: countryOfBirth || "USA",
          },
        });

        // 4. Register Birth Bond
        const birthBond = await birthBondSystem.registerBond({
          ownerId: citizen.id,
          ownerPiUserId: piWalletId,
          certificateNumber: birthCertificateNumber,
          stateOfIssue: stateOfBirth || state || "Unknown",
          dateOfBirth: birthDate,
          registrationDate: new Date(),
        });

        // 5. Create Restitution Profile
        const restitutionProfile = restitutionSystem.createProfile(citizen.id, legalName);

        // 6. Estimate Restitution
        const restitutionEstimate = restitutionSystem.estimateRestitution(birthYear);
        const totalRestitution = restitutionSystem.getTotalEstimate(restitutionEstimate);

        // 7. Link everything in citizen profile
        citizenSystem.linkNESARAProfile(citizen.id, nesaraProfile.id);
        citizenSystem.linkQFSAccount(citizen.id, qfsAccount.id);
        citizenSystem.linkBirthBond(citizen.id, birthBond.id);
        if (piWalletId) {
          citizenSystem.linkPiWallet(citizen.id, piWalletId);
        }

        // 8. Start Private Citizen Application
        const application = citizenSystem.startPrivateCitizenApplication(citizen.id);

        // 9. Get GESARA status for country
        const gesaraStatus = gesaraCompliance.getCountry(countryOfBirth || "US");

        // Compile full ecosystem summary
        const summary = {
          citizenId: citizen.id,
          commonLawName: citizen.commonLawName,
          sovereigntyStatus: citizen.sovereigntyLevel,
          nesara: {
            profileId: nesaraProfile.id,
            status: nesaraProfile.status,
            prosperityFundsEligible: true,
            prosperityAmount: 100000,
          },
          qfs: {
            accountId: qfsAccount.id,
            accountNumber: qfsAccount.accountNumber,
            verified: qfsAccount.isVerified,
            balance: qfsAccount.balance,
          },
          birthBond: {
            bondId: birthBond.id,
            cusip: birthBond.cusipNumber,
            estimatedValue: birthBond.totalValue,
            status: birthBond.status,
          },
          restitution: {
            profileId: restitutionProfile.id,
            estimatedTotal: totalRestitution,
            categories: restitutionEstimate.length,
          },
          application: {
            applicationId: application.id,
            currentStep: application.currentStep,
            totalSteps: application.totalSteps,
            percentComplete: application.percentComplete,
          },
          gesara: {
            country: gesaraStatus?.countryName,
            phase: gesaraStatus?.phase,
            status: gesaraStatus?.status,
            featuresAvailable: gesaraStatus?.features,
          },
        };

        return NextResponse.json({
          success: true,
          message: "Full ecosystem registration complete",
          summary,
          citizen: citizenSystem.getCitizen(citizen.id),
        });
      }

      case "add-property": {
        const { citizenId, propertyDetails } = params;

        if (!citizenId || !propertyDetails) {
          return NextResponse.json(
            { error: "citizenId and propertyDetails are required" },
            { status: 400 }
          );
        }

        const citizen = citizenSystem.getCitizen(citizenId);
        if (!citizen) {
          return NextResponse.json(
            { error: "Citizen not found" },
            { status: 404 }
          );
        }

        // Register property
        const deed = allodialSystem.registerProperty(
          citizenId,
          citizen.commonLawName,
          citizen.citizenType === "private-citizen" ? "private-citizen" : "universal-citizen",
          propertyDetails
        );

        // Get/update portfolio
        const portfolio = allodialSystem.getPortfolio(citizenId);

        // Link to NESARA if applicable
        if (citizen.integration.nesaraProfileId) {
          allodialSystem.linkPortfolioToNESARA(citizenId);
        }

        // Link to QFS
        if (citizen.integration.qfsAccountId) {
          allodialSystem.linkPortfolioToQFS(citizenId);
        }

        // Link portfolio to citizen
        if (portfolio) {
          citizenSystem.linkAllodialPortfolio(citizenId, portfolio.id);
        }

        return NextResponse.json({
          success: true,
          message: "Property added to ecosystem",
          deed,
          portfolio,
        });
      }

      case "process-full-benefits": {
        const { citizenId } = params;

        if (!citizenId) {
          return NextResponse.json(
            { error: "citizenId is required" },
            { status: 400 }
          );
        }

        const citizen = citizenSystem.getCitizen(citizenId);
        if (!citizen) {
          return NextResponse.json(
            { error: "Citizen not found" },
            { status: 404 }
          );
        }

        const results: Record<string, unknown> = {};

        // 1. Process Birth Bond Redemption
        if (citizen.integration.birthBondId && citizen.integration.qfsAccountId) {
          try {
            const bond = birthBondSystem.getBond(citizen.integration.birthBondId);
            if (bond && bond.status === "verified") {
              // Submit redemption request
              const redemption = await birthBondSystem.submitRedemptionRequest({
                bondId: citizen.integration.birthBondId,
                paymentMethod: "qfs-account",
                destinationAccount: citizen.integration.qfsAccountId,
              });
              
              // Auto-approve for sovereign citizens
              if (citizen.sovereigntyLevel === "full-sovereign") {
                await birthBondSystem.approveRedemption(redemption.id);
                const processed = await birthBondSystem.processRedemption(
                  redemption.id,
                  `tx-${Date.now()}`
                );
                results.birthBondRedemption = processed;
              } else {
                results.birthBondRedemption = { status: "pending-sovereignty", redemption };
              }
            } else {
              results.birthBondRedemption = { status: "bond-not-verified", bondStatus: bond?.status };
            }
          } catch (error) {
            results.birthBondRedemption = { error: (error as Error).message };
          }
        }

        // 2. Process NESARA Prosperity Funds
        if (citizen.integration.nesaraProfileId) {
          try {
            const prosperityActivation = await nesaraEngine.activateProsperityFunds(
              citizen.integration.nesaraProfileId
            );
            results.prosperityFunds = prosperityActivation;

            // Process first payment via QFS if account exists
            if (citizen.integration.qfsAccountId && prosperityActivation) {
              const payment = await qfs.processProsperityPayment(
                citizen.integration.qfsAccountId,
                833.33 // First monthly payment ($100,000 / 120 months)
              );
              results.prosperityFirstPayment = payment;
            }
          } catch (error) {
            results.prosperityFunds = { error: (error as Error).message };
          }
        }

        // 3. Process Debt Forgiveness via NESARA
        const portfolio = allodialSystem.getPortfolio(citizenId);
        if (portfolio) {
          const deeds = allodialSystem.getDeedsByOwner(citizenId);
          const clearedDeeds = [];
          
          for (const deed of deeds) {
            if (deed.encumbrances.some(e => e.clearedDate === null)) {
              const cleared = allodialSystem.clearAllEncumbrancesViaNESARA(deed.id);
              clearedDeeds.push({
                deedId: cleared.id,
                address: cleared.streetAddress,
                encumbrancesCleared: cleared.encumbrances.filter(e => e.clearedVia === "nesara-forgiveness").length,
              });
            }
          }
          
          results.debtForgiveness = {
            propertiesProcessed: clearedDeeds.length,
            details: clearedDeeds,
          };
        }

        // 4. Create Restitution Claims
        const restitutionProfileId = citizen.integration.restitutionProfileId;
        if (restitutionProfileId) {
          const birthYear = citizen.dateOfBirth.getFullYear();
          const estimates = restitutionSystem.estimateRestitution(birthYear);
          
          const claims = [];
          for (const estimate of estimates) {
            try {
              const claim = restitutionSystem.createClaim(
                restitutionProfileId,
                estimate.category,
                {
                  description: estimate.label,
                  claimedAmount: estimate.estimatedAmount,
                  startYear: birthYear + 18,
                  endYear: new Date().getFullYear(),
                }
              );
              claims.push(claim);
            } catch {
              // Skip if claim already exists
            }
          }
          
          results.restitutionClaims = {
            claimsCreated: claims.length,
            totalClaimed: claims.reduce((sum, c) => sum + c.claimedAmount, 0),
          };
        }

        // 5. Process UBI Payment
        if (citizen.integration.qfsAccountId && citizen.benefits.ubiEligible) {
          const ubiPayment = qfs.processUBIPayment(
            citizen.integration.qfsAccountId,
            2000, // Monthly UBI amount
            new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
          );
          results.ubiPayment = ubiPayment;
        }

        return NextResponse.json({
          success: true,
          message: "Full benefits processing complete",
          citizenId,
          results,
        });
      }

      case "get-full-profile": {
        const { citizenId } = params;

        if (!citizenId) {
          return NextResponse.json(
            { error: "citizenId is required" },
            { status: 400 }
          );
        }

        const citizen = citizenSystem.getCitizen(citizenId);
        if (!citizen) {
          return NextResponse.json(
            { error: "Citizen not found" },
            { status: 404 }
          );
        }

        const profile: Record<string, unknown> = {
          citizen,
        };

        // Get all linked profiles
        if (citizen.integration.nesaraProfileId) {
          profile.nesaraProfile = await nesaraEngine.getProfile(citizen.integration.nesaraProfileId);
        }

        if (citizen.integration.qfsAccountId) {
          profile.qfsAccount = qfs.getAccount(citizen.integration.qfsAccountId);
        }

        if (citizen.integration.birthBondId) {
          profile.birthBond = birthBondSystem.getBond(citizen.integration.birthBondId);
        }

        if (citizen.integration.restitutionProfileId) {
          profile.restitutionProfile = restitutionSystem.getProfile(citizen.integration.restitutionProfileId);
        }

        if (citizen.integration.allodialPortfolioId) {
          profile.allodialPortfolio = allodialSystem.getPortfolio(citizenId);
        }

        // Get GESARA status
        profile.gesaraStatus = gesaraCompliance.getCountry(citizen.countryOfBirth === "USA" ? "US" : citizen.countryOfBirth);

        return NextResponse.json({
          success: true,
          profile,
        });
      }

      case "ecosystem-stats": {
        const citizenStats = citizenSystem.getStatistics();
        const allodialStats = allodialSystem.getSystemStatistics();
        const gesaraStats = gesaraCompliance.getGlobalStats();
        const restitutionStats = restitutionSystem.getSystemStats();

        return NextResponse.json({
          success: true,
          ecosystem: {
            citizens: citizenStats,
            allodial: allodialStats,
            gesara: gesaraStats,
            restitution: restitutionStats,
          },
        });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action",
            availableActions: [
              "full-registration",
              "add-property",
              "process-full-benefits",
              "get-full-profile",
              "ecosystem-stats",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Ecosystem API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  if (action === "status") {
    const citizenStats = citizenSystem.getStatistics();
    const allodialStats = allodialSystem.getSystemStatistics();
    const gesaraStats = gesaraCompliance.getGlobalStats();

    return NextResponse.json({
      success: true,
      system: "Triumph Synergy Unified Ecosystem",
      status: "FULLY OPERATIONAL",
      version: "1.0.0",
      components: {
        citizenAppliance: "active",
        allodialDeeds: "active",
        nesara: "active",
        qfs: "active",
        birthBonds: "active",
        restitution: "active",
        gesara: "active",
        piNetwork: "active",
      },
      stats: {
        citizens: citizenStats.totalCitizens,
        sovereignCitizens: citizenStats.bySovereignty["full-sovereign"],
        properties: allodialStats.totalDeeds,
        allodialTitles: allodialStats.deedsByStatus["allodial-complete"],
        gesaraCountries: gesaraStats.totalCountries,
        compliantCountries: gesaraStats.compliantCountries,
      },
      piValues: {
        internal: 314159,
        external: 314.159,
        allodialMultiplier: 3.14159,
      },
    });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/allodial/ecosystem",
    description: "Unified Ecosystem Integration - Triumph Synergy",
    purpose: "Single endpoint for complete citizen and property sovereignty integration",
    systems: [
      "Citizen Appliance System",
      "Allodial Deed System",
      "NESARA/GESARA Engine",
      "Quantum Financial System",
      "Birth Certificate Bonds",
      "Restitution System",
      "Pi Network Integration",
    ],
    methods: {
      GET: ["status"],
      POST: [
        "full-registration",
        "add-property",
        "process-full-benefits",
        "get-full-profile",
        "ecosystem-stats",
      ],
    },
  });
}
