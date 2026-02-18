import { createSupabaseServer } from "@/lib/supabase/server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { redirect } from "next/navigation";
import { ApiKeyProvider } from "./hooks/use-api-keys";
import { ApiKeyModal } from "./components/api-key-modal";

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
    if (!user) {
      return redirect("/signin");
    }
  return (
    <ApiKeyProvider>
      <div className="flex h-screen">
          <SidebarProvider defaultOpen={true}>
            <AppSidebar user={user} />
            <div className="flex-1 ">{children}</div>
            <ApiKeyModal />
          </SidebarProvider>
      </div>
    </ApiKeyProvider>
  );
}

