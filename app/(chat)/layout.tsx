import { cookies, headers } from "next/headers";
import Script from "next/script";
import { AppSidebar } from "@/components/app-sidebar";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "../(auth)/auth";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, cookieStore, headersStore] = await Promise.all([
    auth(),
    cookies(),
    headers(),
  ]);
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  // Check if in Pi Browser (user agent contains 'Pi')
  const userAgent = headersStore.get("user-agent") || "";
  const isPiBrowser =
    userAgent.includes("Pi") || userAgent.includes("Pi Browser");

  return (
    <>
      {!isPiBrowser && (
        <Script
          src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
          strategy="beforeInteractive"
        />
      )}
      <DataStreamProvider>
        <SidebarProvider defaultOpen={!isCollapsed}>
          <AppSidebar user={session?.user} />
          <SidebarInset>{children}</SidebarInset>
        </SidebarProvider>
      </DataStreamProvider>
    </>
  );
}
