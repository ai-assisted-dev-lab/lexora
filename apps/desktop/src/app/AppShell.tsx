import "./AppShell.css";

import type { ReactNode } from "react";

import { Header } from "@/components/layout/Header";
import { MainContent } from "@/components/layout/MainContent";
import { RightPanel } from "@/components/layout/RightPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { TitleBar } from "@/components/window/TitleBar";

interface AppShellProps {
  children?: ReactNode;
  showRightPanel?: boolean;
}

export function AppShell({ children, showRightPanel = true }: AppShellProps) {
  return (
    <div className="app-shell">
      <TitleBar />
      <div className="app-shell__workspace">
        <Sidebar />
        <div className="app-shell__stage">
          <Header />
          <div className="app-shell__content-row">
            <MainContent>{children}</MainContent>
            {showRightPanel && <RightPanel />}
          </div>
        </div>
      </div>
    </div>
  );
}
