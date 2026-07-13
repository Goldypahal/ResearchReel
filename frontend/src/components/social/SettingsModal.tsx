"use client";

import ProfileSettingsModal from '@/components/profile/SettingsModal';
import { useSocial } from '@/context/SocialContext';

export default function SettingsModal() {
  const { isSettingsOpen, setIsSettingsOpen } = useSocial();

  return (
    <ProfileSettingsModal
      isOpen={isSettingsOpen}
      onClose={() => setIsSettingsOpen(false)}
    />
  );
}
