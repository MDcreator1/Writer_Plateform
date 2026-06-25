"use client";

import { registry } from "./reader-layouts/registry";
import { type Story } from "@/lib/content";

type ReaderUser = {
  id: string;
  username: string;
  emailHash: string;
  sessionId: string;
};

type ReaderPageProps = {
  story: Story;
  initialCoinBalance: number;
  currentUser: ReaderUser;
  activeLayout: string;
  recommendations?: Story[];
  studioData?: any;
};

export function ReaderPage({ activeLayout, ...props }: ReaderPageProps) {
  // Resolve the layout from the registry, fallback to classic
  const SelectedLayout = registry[activeLayout] || registry.classic;
  return <SelectedLayout {...props} />;
}