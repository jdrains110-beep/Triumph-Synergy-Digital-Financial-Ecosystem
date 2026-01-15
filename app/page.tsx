import { cookies } from "next/headers";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID } from "@/lib/utils";
import { auth } from "./(auth)/auth";

export default async function Page() {
  const id = generateUUID();
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);
  const modelIdFromCookie = cookieStore.get("chat-model");
  const isCollapsed = cookieStore.get("sidebar_state")?.value !== "true";

  return (
    <SidebarProvider defaultOpen={!isCollapsed}>
      <AppSidebar user={session?.user} />
      <SidebarInset>
        <Chat
          autoResume={false}
          id={id}
          initialChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
          initialMessages={[]}
          initialVisibilityType={session ? "private" : "public"}
          isReadonly={false}
          key={id}
        />
        <DataStreamHandler />
      </SidebarInset>
    </SidebarProvider>
  );
}
