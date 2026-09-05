"use client";

import React from 'react';
import AppShell from './AppShell';

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}

