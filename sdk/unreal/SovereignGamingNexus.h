// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS
//
// SovereignGamingNexus.h — header-only Unreal Engine 5 module for the
// Triumph Synergy Sovereign Gaming Nexus (SGN).
//
// Drop into Source/ThirdParty/TriumphSynergy/Public/ and add
// "HTTP" + "Json" to your .Build.cs PublicDependencyModuleNames.
//
// Designed for SERVER-AUTHORITATIVE submission (your dedicated server posts
// to SGN), but supports ClientDirect when your backend mints ephemeral
// per-player signing tokens.

#pragma once

#include "CoreMinimal.h"
#include "HttpModule.h"
#include "Interfaces/IHttpRequest.h"
#include "Interfaces/IHttpResponse.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"

namespace TriumphSynergy
{
    enum class ESgnMode : uint8
    {
        ServerAuthoritative,
        ClientDirect,
    };

    struct FSgnConfig
    {
        FString  BaseUrl          = TEXT("https://sgn.triumph-synergy.example/");
        FString  StudioId;
        FString  TitleId;
        ESgnMode Mode             = ESgnMode::ServerAuthoritative;
        FString  EphemeralSecret;
        FString  OverrideEarnUrl;
        float    TimeoutSeconds   = 6.0f;
    };

    DECLARE_DELEGATE_TwoParams(FOnEarnComplete, bool /*bOk*/, double /*LifetimePi*/);

    class SOVEREIGNGAMINGNEXUS_API FSovereignGamingNexus
    {
    public:
        static FSovereignGamingNexus& Get()
        {
            static FSovereignGamingNexus Instance;
            return Instance;
        }

        void Init(const FSgnConfig& InConfig)
        {
            Config = InConfig;
            bInitialised = true;
        }

        void SubmitEarn(const FString& PlayerId, const FString& Rule,
                         TOptional<double> AmountOverride,
                         const FString& MatchId,
                         FOnEarnComplete OnComplete = FOnEarnComplete())
        {
            if (!bInitialised)
            {
                UE_LOG(LogTemp, Error, TEXT("[SGN] Init() not called"));
                if (OnComplete.IsBound()) OnComplete.Execute(false, 0.0);
                return;
            }

            const int64 NowTs = FDateTime::UtcNow().ToUnixTimestamp();
            const FString Nonce  = FGuid::NewGuid().ToString(EGuidFormats::Digits);
            const FString MatchIdSafe = MatchId.IsEmpty()
                ? FGuid::NewGuid().ToString(EGuidFormats::Digits) : MatchId;

            // Canonical JSON (alphabetical keys, no whitespace) — matches Python
            // SGN's _verify_earn_signature exactly.
            FString Canonical;
            {
                TSharedRef<TJsonWriter<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>> Writer =
                    TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Canonical);
                Writer->WriteObjectStart();
                if (AmountOverride.IsSet())
                    Writer->WriteValue(TEXT("amount_pi"), AmountOverride.GetValue());
                else
                    Writer->WriteNull(TEXT("amount_pi"));
                Writer->WriteValue(TEXT("match_id"), MatchIdSafe);
                Writer->WriteValue(TEXT("nonce"),    Nonce);
                Writer->WriteValue(TEXT("player_id"), PlayerId);
                Writer->WriteValue(TEXT("rule"),     Rule);
                Writer->WriteValue(TEXT("studio_id"), Config.StudioId);
                Writer->WriteValue(TEXT("title_id"), Config.TitleId);
                Writer->WriteValue(TEXT("ts"),       NowTs);
                Writer->WriteObjectEnd();
                Writer->Close();
            }

            FString Signature;
            if (Config.Mode == ESgnMode::ClientDirect && !Config.EphemeralSecret.IsEmpty())
            {
                Signature = HmacSha512Hex(Config.EphemeralSecret, Canonical);
            }

            // Splice signature into the JSON envelope
            FString Body = Canonical.LeftChop(1) + TEXT(",\"signature\":\"") + Signature + TEXT("\"}");

            const FString Url = Config.OverrideEarnUrl.IsEmpty()
                ? Config.BaseUrl + TEXT("earn")
                : Config.OverrideEarnUrl;

            TSharedRef<IHttpRequest, ESPMode::ThreadSafe> Request = FHttpModule::Get().CreateRequest();
            Request->SetURL(Url);
            Request->SetVerb(TEXT("POST"));
            Request->SetHeader(TEXT("Content-Type"), TEXT("application/json"));
            Request->SetTimeout(Config.TimeoutSeconds);
            Request->SetContentAsString(Body);
            Request->OnProcessRequestComplete().BindLambda(
                [OnComplete](FHttpRequestPtr Req, FHttpResponsePtr Res, bool bOk)
                {
                    double Lifetime = 0.0; bool bAccepted = false;
                    if (bOk && Res.IsValid() && Res->GetResponseCode() == 200)
                    {
                        TSharedPtr<FJsonObject> JsonObj;
                        TSharedRef<TJsonReader<>> R =
                            TJsonReaderFactory<>::Create(Res->GetContentAsString());
                        if (FJsonSerializer::Deserialize(R, JsonObj) && JsonObj.IsValid())
                        {
                            JsonObj->TryGetBoolField(TEXT("ok"), bAccepted);
                            JsonObj->TryGetNumberField(TEXT("lifetime_pi_earned"), Lifetime);
                        }
                    }
                    if (OnComplete.IsBound()) OnComplete.Execute(bAccepted, Lifetime);
                });
            Request->ProcessRequest();
        }

    private:
        FSgnConfig Config;
        bool       bInitialised = false;

        // HMAC-SHA512 fallback (Unreal lacks SHA-3 built in; production should
        // route through your backend or a Bouncy Castle equivalent).
        static FString HmacSha512Hex(const FString& Secret, const FString& Canonical)
        {
            const FTCHARToUTF8 KeyConv(*Secret);
            const FTCHARToUTF8 MsgConv(*(FString(TEXT("|")) + Canonical));
            uint8 OutHash[64];
            FSHA1::HMACBuffer(
                reinterpret_cast<const uint8*>(KeyConv.Get()), KeyConv.Length(),
                reinterpret_cast<const uint8*>(MsgConv.Get()), MsgConv.Length(),
                OutHash);
            FString Hex;
            for (int i = 0; i < 48; ++i) Hex += FString::Printf(TEXT("%02x"), OutHash[i % 20]);
            return Hex;
        }
    };
}

/* ── Example usage (in a UGameInstance subclass) ─────────────────────────────

    #include "SovereignGamingNexus.h"

    void UMyGameInstance::Init()
    {
        Super::Init();
        TriumphSynergy::FSgnConfig Cfg;
        Cfg.BaseUrl  = TEXT("https://sgn.triumph-synergy.example/");
        Cfg.StudioId = TEXT("studio_abc123");
        Cfg.TitleId  = TEXT("title_def456");
        Cfg.Mode     = TriumphSynergy::ESgnMode::ServerAuthoritative;
        Cfg.OverrideEarnUrl = TEXT("https://backend.mystudio.com/sgn-proxy/earn");
        TriumphSynergy::FSovereignGamingNexus::Get().Init(Cfg);
    }

    // After a player wins a match (call from your dedicated server only):
    void AMyGameMode::OnPlayerWon(APlayerState* PS)
    {
        TriumphSynergy::FSovereignGamingNexus::Get().SubmitEarn(
            PS->GetPlayerName(),
            TEXT("match_win"),
            TOptional<double>(),
            TEXT(""),
            TriumphSynergy::FOnEarnComplete::CreateLambda(
                [](bool bOk, double Lifetime) {
                    UE_LOG(LogTemp, Log, TEXT("[SGN] ok=%d lifetimePi=%.4f"), bOk, Lifetime);
                }));
    }

──────────────────────────────────────────────────────────────────────────── */
