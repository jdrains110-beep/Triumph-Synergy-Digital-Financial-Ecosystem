"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Coins,
  Factory,
  Globe,
  Hash,
  Layers,
  Link2,
  Loader2,
  Package,
  Search,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// ============================================================================
// Types
// ============================================================================

type TokenizedProduct = {
  id: string;
  standard: string;
  category: string;
  metadata: { name: string; symbol: string; description: string };
  status: string;
  totalSupply: number;
  circulatingSupply: number;
  priceInPi: number;
  binding: {
    txHash: string;
    ledger: number;
    assetCode: string;
    network: string;
    confirmedAt: string;
  } | null;
  provenance: Array<{
    timestamp: string;
    action: string;
    actor: string;
    txHash?: string;
    details: string;
  }>;
  createdAt: string;
};

type TokenizedCompany = {
  id: string;
  name: string;
  industry: string;
  jurisdiction: string;
  tokenType: string;
  standard: string;
  status: string;
  totalSupply: number;
  distributed: number;
  valuationInPi: number;
  productIds: string[];
  binding: {
    txHash: string;
    ledger: number;
    assetCode: string;
    network: string;
    confirmedAt: string;
  } | null;
  createdAt: string;
};

type EcosystemStats = {
  tokenization: {
    totalProducts: number;
    totalCompanies: number;
    boundProducts: number;
    boundCompanies: number;
    totalTokensIssued: number;
    totalValueInPi: number;
    byStandard: Record<string, number>;
    byCategory: Record<string, number>;
  };
  totalBindings: number;
  totalProvenance: number;
};

type VerificationResult = {
  tokenId: string;
  type: string;
  bound: boolean;
  verified: boolean;
  txHash?: string;
  ledger?: number;
  network?: string;
  onChainValid: boolean;
  provenanceCount: number;
  holderCount: number;
};

// ============================================================================
// Component
// ============================================================================

export function TokenizationDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<EcosystemStats | null>(null);
  const [products, setProducts] = useState<TokenizedProduct[]>([]);
  const [companies, setCompanies] = useState<TokenizedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    products: TokenizedProduct[];
    companies: TokenizedCompany[];
  } | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(
    null
  );
  const [verifyId, setVerifyId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for tokenization
  const [newProduct, setNewProduct] = useState({
    name: "",
    symbol: "",
    description: "",
    category: "physical-product",
    standard: "PT-20",
    totalSupply: "1000",
    priceInPi: "1",
    ownerAddress: "",
  });
  const [newCompany, setNewCompany] = useState({
    name: "",
    symbol: "",
    description: "",
    registrationNumber: "",
    industry: "",
    jurisdiction: "",
    tokenType: "equity-token",
    totalSupply: "1000000",
    valuationInPi: "100000",
    ownerAddress: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch stats on mount
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/tokenize?action=stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {
      /* silent */
    }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/tokenize");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data.products || []);
        setCompanies(data.data.companies || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAll();
  }, [fetchStats, fetchAll]);

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/tokenize?action=search&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await res.json();
      if (data.success) setSearchResults(data.data);
    } catch {
      setError("Search failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Verify
  const handleVerify = async () => {
    if (!verifyId.trim()) return;
    setIsLoading(true);
    setVerification(null);
    try {
      const res = await fetch(
        `/api/tokenize?action=verify&id=${encodeURIComponent(verifyId)}`
      );
      const data = await res.json();
      if (data.success) setVerification(data.data);
      else setError(data.error);
    } catch {
      setError("Verification failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Tokenize product
  const handleTokenizeProduct = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "product",
          ownerAddress: newProduct.ownerAddress,
          category: newProduct.category,
          standard: newProduct.standard,
          metadata: {
            name: newProduct.name,
            symbol: newProduct.symbol,
            description: newProduct.description,
            attributes: {},
          },
          totalSupply: Number(newProduct.totalSupply),
          priceInPi: Number(newProduct.priceInPi),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({
          success: true,
          message: `Product tokenized! ID: ${data.data.productId} | Tx: ${data.data.binding?.txHash || "pending"}`,
        });
        fetchAll();
        fetchStats();
      } else {
        setSubmitResult({ success: false, message: data.error });
      }
    } catch (e) {
      setSubmitResult({
        success: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tokenize company
  const handleTokenizeCompany = async () => {
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await fetch("/api/tokenize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "company",
          name: newCompany.name,
          registrationNumber: newCompany.registrationNumber,
          industry: newCompany.industry,
          jurisdiction: newCompany.jurisdiction,
          description: newCompany.description,
          ownerAddress: newCompany.ownerAddress,
          tokenType: newCompany.tokenType,
          metadata: {
            name: newCompany.name,
            symbol: newCompany.symbol,
            description: newCompany.description,
            attributes: {},
          },
          totalSupply: Number(newCompany.totalSupply),
          valuationInPi: Number(newCompany.valuationInPi),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitResult({
          success: true,
          message: `Company tokenized! ID: ${data.data.companyId} | Tx: ${data.data.binding?.txHash || "pending"}`,
        });
        fetchAll();
        fetchStats();
      } else {
        setSubmitResult({ success: false, message: data.error });
      }
    } catch (e) {
      setSubmitResult({
        success: false,
        message: e instanceof Error ? e.message : "Failed",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tokenization & Blockchain Binding</h1>
          <p className="text-sm text-muted-foreground">
            Tokenize products and companies on Pi Network&apos;s blockchain
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="tokenize">Tokenize</TabsTrigger>
          <TabsTrigger value="verify">Verify</TabsTrigger>
        </TabsList>

        {/* === OVERVIEW TAB === */}
        <TabsContent value="overview" className="space-y-4">
          {stats ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                  icon={<Package className="h-5 w-5" />}
                  label="Products"
                  value={stats.tokenization.totalProducts}
                  sub={`${stats.tokenization.boundProducts} bound`}
                />
                <StatCard
                  icon={<Building2 className="h-5 w-5" />}
                  label="Companies"
                  value={stats.tokenization.totalCompanies}
                  sub={`${stats.tokenization.boundCompanies} bound`}
                />
                <StatCard
                  icon={<Link2 className="h-5 w-5" />}
                  label="Blockchain Bindings"
                  value={stats.totalBindings}
                  sub={`${stats.totalProvenance} provenance`}
                />
                <StatCard
                  icon={<Coins className="h-5 w-5" />}
                  label="Total Value"
                  value={`${stats.tokenization.totalValueInPi.toLocaleString()} π`}
                  sub={`${stats.tokenization.totalTokensIssued.toLocaleString()} tokens`}
                />
              </div>

              {/* Token Standards Breakdown */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Token Standards</h3>
                <div className="flex gap-4">
                  {Object.entries(stats.tokenization.byStandard).map(
                    ([std, count]) => (
                      <div
                        key={std}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted"
                      >
                        <Badge variant="outline">{std}</Badge>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    )
                  )}
                </div>
              </Card>

              {/* Search */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Search className="h-4 w-4" /> Search Tokenized Assets
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name, category, or industry..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Search"
                    )}
                  </Button>
                </div>
                {searchResults && (
                  <div className="mt-3 text-sm">
                    <p className="text-muted-foreground">
                      Found {searchResults.products.length} products,{" "}
                      {searchResults.companies.length} companies
                    </p>
                    {searchResults.products.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2 mt-2 p-2 rounded bg-muted"
                      >
                        <Package className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">{p.metadata.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {p.standard}
                        </Badge>
                        <StatusBadge status={p.status} />
                      </div>
                    ))}
                    {searchResults.companies.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center gap-2 mt-2 p-2 rounded bg-muted"
                      >
                        <Building2 className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">{c.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {c.tokenType}
                        </Badge>
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          ) : (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading ecosystem stats...
            </div>
          )}
        </TabsContent>

        {/* === PRODUCTS TAB === */}
        <TabsContent value="products" className="space-y-3">
          {products.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tokenized products yet</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setActiveTab("tokenize")}
              >
                Tokenize Your First Product
              </Button>
            </Card>
          ) : (
            products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </TabsContent>

        {/* === COMPANIES TAB === */}
        <TabsContent value="companies" className="space-y-3">
          {companies.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tokenized companies yet</p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => setActiveTab("tokenize")}
              >
                Tokenize Your Company
              </Button>
            </Card>
          ) : (
            companies.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))
          )}
        </TabsContent>

        {/* === TOKENIZE TAB === */}
        <TabsContent value="tokenize" className="space-y-4">
          {submitResult && (
            <Card
              className={`p-3 ${
                submitResult.success
                  ? "border-green-500 bg-green-50 dark:bg-green-950"
                  : "border-red-500 bg-red-50 dark:bg-red-950"
              }`}
            >
              <div className="flex items-center gap-2">
                {submitResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <span className="text-sm">{submitResult.message}</span>
              </div>
            </Card>
          )}

          <Tabs defaultValue="product">
            <TabsList>
              <TabsTrigger value="product">
                <Package className="h-4 w-4 mr-1" /> Product
              </TabsTrigger>
              <TabsTrigger value="company">
                <Building2 className="h-4 w-4 mr-1" /> Company
              </TabsTrigger>
            </TabsList>

            {/* Product Form */}
            <TabsContent value="product">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold">Tokenize a Product</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Product Name
                    </label>
                    <Input
                      placeholder="My Product"
                      value={newProduct.name}
                      onChange={(e) =>
                        setNewProduct({ ...newProduct, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Token Symbol
                    </label>
                    <Input
                      placeholder="PROD"
                      maxLength={12}
                      value={newProduct.symbol}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          symbol: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="Describe this product..."
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Category
                    </label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newProduct.category}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="physical-product">Physical Product</option>
                      <option value="digital-product">Digital Product</option>
                      <option value="service">Service</option>
                      <option value="intellectual-property">
                        Intellectual Property
                      </option>
                      <option value="real-estate">Real Estate</option>
                      <option value="commodity">Commodity</option>
                      <option value="collectible">Collectible</option>
                      <option value="certificate">Certificate</option>
                      <option value="license">License</option>
                      <option value="subscription">Subscription</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Token Standard
                    </label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newProduct.standard}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          standard: e.target.value,
                        })
                      }
                    >
                      <option value="PT-20">PT-20 (Fungible)</option>
                      <option value="PT-721">PT-721 (Non-Fungible / Unique)</option>
                      <option value="PT-1155">PT-1155 (Multi-Token)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Total Supply
                    </label>
                    <Input
                      type="number"
                      value={newProduct.totalSupply}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          totalSupply: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Price (π)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newProduct.priceInPi}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          priceInPi: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Owner Address
                    </label>
                    <Input
                      placeholder="G..."
                      value={newProduct.ownerAddress}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          ownerAddress: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleTokenizeProduct}
                  disabled={
                    isSubmitting ||
                    !newProduct.name ||
                    !newProduct.symbol ||
                    !newProduct.ownerAddress
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-4 w-4 mr-2" />
                  )}
                  Tokenize & Bind to Pi Blockchain
                </Button>
              </Card>
            </TabsContent>

            {/* Company Form */}
            <TabsContent value="company">
              <Card className="p-4 space-y-3">
                <h3 className="font-semibold">Tokenize a Company</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Company Name
                    </label>
                    <Input
                      placeholder="Acme Corp"
                      value={newCompany.name}
                      onChange={(e) =>
                        setNewCompany({ ...newCompany, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Token Symbol
                    </label>
                    <Input
                      placeholder="ACME"
                      maxLength={12}
                      value={newCompany.symbol}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          symbol: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Registration Number
                    </label>
                    <Input
                      placeholder="REG-12345"
                      value={newCompany.registrationNumber}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          registrationNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Industry
                    </label>
                    <Input
                      placeholder="Technology"
                      value={newCompany.industry}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          industry: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Jurisdiction
                    </label>
                    <Input
                      placeholder="US"
                      value={newCompany.jurisdiction}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          jurisdiction: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Token Type
                    </label>
                    <select
                      className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                      value={newCompany.tokenType}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          tokenType: e.target.value,
                        })
                      }
                    >
                      <option value="equity-token">Equity Token</option>
                      <option value="revenue-share">Revenue Share</option>
                      <option value="governance-token">Governance Token</option>
                      <option value="utility-token">Utility Token</option>
                      <option value="security-token">Security Token</option>
                      <option value="debt-token">Debt Token</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">
                    Description
                  </label>
                  <Input
                    placeholder="Describe the company..."
                    value={newCompany.description}
                    onChange={(e) =>
                      setNewCompany({
                        ...newCompany,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Total Supply
                    </label>
                    <Input
                      type="number"
                      value={newCompany.totalSupply}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          totalSupply: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Valuation (π)
                    </label>
                    <Input
                      type="number"
                      value={newCompany.valuationInPi}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          valuationInPi: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Owner Address
                    </label>
                    <Input
                      placeholder="G..."
                      value={newCompany.ownerAddress}
                      onChange={(e) =>
                        setNewCompany({
                          ...newCompany,
                          ownerAddress: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleTokenizeCompany}
                  disabled={
                    isSubmitting ||
                    !newCompany.name ||
                    !newCompany.symbol ||
                    !newCompany.registrationNumber ||
                    !newCompany.ownerAddress
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Building2 className="h-4 w-4 mr-2" />
                  )}
                  Tokenize & Bind Company to Pi Blockchain
                </Button>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* === VERIFY TAB === */}
        <TabsContent value="verify" className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Verify Blockchain Binding
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter token ID or product/company ID..."
                value={verifyId}
                onChange={(e) => setVerifyId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <Button onClick={handleVerify} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            {verification && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  {verification.onChainValid ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-semibold">
                    {verification.onChainValid
                      ? "Verified on Pi Blockchain"
                      : "Not Verified"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>{" "}
                    {verification.type}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Bound:</span>{" "}
                    {verification.bound ? "Yes" : "No"}
                  </div>
                  {verification.txHash && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Tx Hash:</span>{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        {verification.txHash}
                      </code>
                    </div>
                  )}
                  {verification.ledger && (
                    <div>
                      <span className="text-muted-foreground">Ledger:</span>{" "}
                      {verification.ledger}
                    </div>
                  )}
                  {verification.network && (
                    <div>
                      <span className="text-muted-foreground">Network:</span>{" "}
                      {verification.network}
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Provenance:</span>{" "}
                    {verification.provenanceCount} records
                  </div>
                  <div>
                    <span className="text-muted-foreground">Holders:</span>{" "}
                    {verification.holderCount}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {error && (
            <Card className="p-3 border-red-500 bg-red-50 dark:bg-red-950">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {error}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    draft: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    minting: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    verified: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${colors[status] || "bg-muted"}`}
    >
      {status}
    </span>
  );
}

function ProductCard({ product }: { product: TokenizedProduct }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
            <Package className="h-5 w-5 text-blue-600 dark:text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{product.metadata.name}</h4>
              <Badge variant="outline" className="text-xs">
                {product.standard}
              </Badge>
              <StatusBadge status={product.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {product.metadata.description}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">{product.priceInPi} π</div>
          <div className="text-muted-foreground">
            {product.circulatingSupply}/{product.totalSupply}
          </div>
        </div>
      </div>
      {product.binding && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {product.binding.txHash.slice(0, 16)}...
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Ledger {product.binding.ledger}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {product.binding.network}
          </span>
          <span>
            {product.provenance.length} provenance records
          </span>
        </div>
      )}
    </Card>
  );
}

function CompanyCard({ company }: { company: TokenizedCompany }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900">
            <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{company.name}</h4>
              <Badge variant="outline" className="text-xs">
                {company.tokenType}
              </Badge>
              <StatusBadge status={company.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {company.industry} · {company.jurisdiction}
            </p>
          </div>
        </div>
        <div className="text-right text-sm">
          <div className="font-semibold">
            {company.valuationInPi.toLocaleString()} π
          </div>
          <div className="text-muted-foreground">
            {company.distributed.toLocaleString()}/
            {company.totalSupply.toLocaleString()} tokens
          </div>
        </div>
      </div>
      {company.binding && (
        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Hash className="h-3 w-3" />
            {company.binding.txHash.slice(0, 16)}...
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3 w-3" />
            Ledger {company.binding.ledger}
          </span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            {company.binding.network}
          </span>
          <span>{company.productIds.length} products</span>
        </div>
      )}
    </Card>
  );
}
