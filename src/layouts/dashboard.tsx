import type React from "react";
import { useState } from "react";
import BaseLayout from "./base";
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import { Outlet } from "react-router-dom";

const DashboardLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <BaseLayout showThemeToggle={false}>
      <div className="min-h-dvh bg-background">
        {/* Sidebar (fijo) */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Wrapper que respeta el ancho del sidebar en lg+ */}
        <div className="lg:pl-[var(--sbw,18rem)] flex flex-col">
          {/* Header */}
          <Header onMenuClick={() => setSidebarOpen(true)} />

          {/* Contenido */}
          <main className="flex-1 overflow-y-auto bg-muted/30 px-4 sm:px-6 py-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </BaseLayout>
  );
};

export default DashboardLayout;
