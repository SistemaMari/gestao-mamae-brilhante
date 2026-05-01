import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";

/**
 * Versão de vitrine (pública, sem login) do painel administrativo.
 * Reaproveita AdminSidebar e AdminHeader sem a verificação de admin.
 * O AdminSidebar detecta `/vitrine/admin` e prefixa as URLs automaticamente.
 */
export default function PreviewAdminLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-[#F8FAFC]">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AdminHeader nomeAdmin="Administrador (vitrine)" />
          <main className="flex-1 p-4 md:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
