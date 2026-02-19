import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/app/chat/components/sidebar/app-sidebar";
import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AgentLayout({
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
    <div className="flex h-screen">
      <SidebarProvider defaultOpen={false}>
        <AppSidebar user={user} />
        <div className="flex-1">{children}</div>
      </SidebarProvider>
    </div>
  );
}
