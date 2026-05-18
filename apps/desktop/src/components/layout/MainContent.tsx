import "./MainContent.css";

import type { ReactNode } from "react";

import { PageContainer } from "@/components/ui";

interface MainContentProps {
  children?: ReactNode;
}

export function MainContent({ children }: MainContentProps) {
  return <PageContainer className="main-content">{children}</PageContainer>;
}
