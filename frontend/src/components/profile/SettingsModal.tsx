"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  AtSign,
  BadgeCheck,
  Ban,
  BarChart2,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Download,
  EyeOff,
  Film,
  Globe,
  HeartOff,
  Home,
  Lock,
  MessageCircle,
  Monitor,
  Search,
  Send,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Type,
  User,
  X
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useSocial } from '@/context/SocialContext';
import { useTheme } from '@/context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
}

type SettingsTab =
  | 'edit_profile'
  | 'notifications'
  | 'account_privacy'
  | 'close_friends'
  | 'blocked'
  | 'story_location'
  | 'messages_replies'
  | 'tags_mentions'
  | 'comments'
  | 'sharing'
  | 'restricted'
  | 'hidden_words'
  | 'muted'
  | 'content_pref'
  | 'like_counts'
  | 'creator_subs'
  | 'archiving'
  | 'accessibility'
  | 'language'
  | 'website_perms'
  | 'supervision'
  | 'account_type'
  | 'verified';

type ProfileForm = {
  fullName: string;
  username: string;
  website: string;
  bio: string;
  orcid: string;
  institution: string;
  interests: string;
  title: string;
};

type Preferences = {
  toggles: Record<string, boolean>;
  language: string;
  accountType: string;
  websiteAccess: string;
  hiddenWords: string;
  blockedQuery: string;
  mutedQuery: string;
};

const STORAGE_KEY = 'researchreel.settings.v2';

const menuSections: {
  title?: string;
  items: { id: SettingsTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[];
}[] = [
  {
    items: [
      { id: 'edit_profile', label: 'Edit profile', icon: User },
      { id: 'notifications', label: 'Notifications', icon: Bell },
    ]
  },
  {
    title: 'Who can see your content',
    items: [
      { id: 'account_privacy', label: 'Account privacy', icon: Lock },
      { id: 'close_friends', label: 'Close collaborators', icon: Star },
      { id: 'blocked', label: 'Blocked', icon: Ban },
      { id: 'story_location', label: 'Story and location', icon: EyeOff },
    ]
  },
  {
    title: 'How others interact with you',
    items: [
      { id: 'messages_replies', label: 'Messages and replies', icon: Send },
      { id: 'tags_mentions', label: 'Tags and mentions', icon: AtSign },
      { id: 'comments', label: 'Comments', icon: MessageCircle },
      { id: 'sharing', label: 'Sharing', icon: Share2 },
      { id: 'restricted', label: 'Restricted accounts', icon: ShieldCheck },
      { id: 'hidden_words', label: 'Hidden words', icon: Type },
    ]
  },
  {
    title: 'What you see',
    items: [
      { id: 'muted', label: 'Muted accounts', icon: BellOff },
      { id: 'content_pref', label: 'Content preferences', icon: Film },
      { id: 'like_counts', label: 'Like and share counts', icon: HeartOff },
      { id: 'creator_subs', label: 'Creator subscriptions', icon: Crown },
    ]
  },
  {
    title: 'Your app and media',
    items: [
      { id: 'archiving', label: 'Archiving and downloading', icon: Download },
      { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
      { id: 'language', label: 'Language', icon: Globe },
      { id: 'website_perms', label: 'Website permissions', icon: Monitor },
    ]
  },
  {
    title: 'Professional tools',
    items: [
      { id: 'supervision', label: 'Lab supervision', icon: Home },
      { id: 'account_type', label: 'Account type and tools', icon: BarChart2 },
      { id: 'verified', label: 'ResearchReel Verified', icon: BadgeCheck },
    ]
  }
];

const panelCopy: Partial<Record<SettingsTab, { title: string; description: string; toggles: { key: string; label: string; help: string }[] }>> = {
  notifications: {
    title: 'Notifications',
    description: 'Choose which research moments deserve your attention.',
    toggles: [
      { key: 'pauseAll', label: 'Pause all', help: 'Temporarily silence push and email notifications.' },
      { key: 'newFollowers', label: 'New followers', help: 'Know when another researcher follows your work.' },
      { key: 'paperCitations', label: 'Paper citations', help: 'Get alerted when your papers are cited in discussions.' },
      { key: 'directMessages', label: 'Direct messages', help: 'Notify you about new scholarly conversations.' },
      { key: 'mentions', label: 'Mentions', help: 'Track when your username is referenced in posts or reels.' },
    ]
  },
  account_privacy: {
    title: 'Account privacy',
    description: 'Control who can inspect your research portfolio and activity.',
    toggles: [
      { key: 'privateAccount', label: 'Private account', help: 'Only approved followers can see your profile feed.' },
      { key: 'hidePublicationHistory', label: 'Hide publication history', help: 'Keep imported papers off public profile surfaces.' },
      { key: 'disableSearchIndexing', label: 'Disable search indexing', help: 'Ask external search engines not to index your profile.' },
    ]
  },
  close_friends: {
    title: 'Close collaborators',
    description: 'Create a trusted audience for drafts, lab notes, and early reels.',
    toggles: [
      { key: 'collaboratorRing', label: 'Enable collaborator ring', help: 'Show a green ring for trusted collaborators.' },
      { key: 'draftOnlySharing', label: 'Draft-only sharing', help: 'Limit unpublished work to close collaborators.' },
    ]
  },
  story_location: {
    title: 'Story and location',
    description: 'Set boundaries for conference updates, field work, and story replies.',
    toggles: [
      { key: 'shareLocation', label: 'Share location in updates', help: 'Attach venue or field-site context to story posts.' },
      { key: 'allowStoryReplies', label: 'Allow story replies', help: 'Let followers respond to your temporary updates.' },
      { key: 'archiveStories', label: 'Archive stories automatically', help: 'Keep a private record of stories after they expire.' },
    ]
  },
  messages_replies: {
    title: 'Messages and replies',
    description: 'Tune direct communication without closing the door on collaboration.',
    toggles: [
      { key: 'messagesAnyone', label: 'Allow messages from anyone', help: 'Receive requests from researchers outside your network.' },
      { key: 'filterRequests', label: 'Filter low-quality requests', help: 'Move likely spam and boilerplate outreach into requests.' },
      { key: 'readReceipts', label: 'Send read receipts', help: 'Let collaborators know when you have seen their messages.' },
    ]
  },
  tags_mentions: {
    title: 'Tags and mentions',
    description: 'Manage how people connect you to papers, reels, and project threads.',
    toggles: [
      { key: 'allowTags', label: 'Allow tagging in papers', help: 'Let others tag you in research posts and imports.' },
      { key: 'approveMentions', label: 'Manually approve mentions', help: 'Review mentions before they appear on your profile.' },
      { key: 'tagNotifications', label: 'Tag notifications', help: 'Notify you when tags need review.' },
    ]
  },
  comments: {
    title: 'Comments',
    description: 'Keep scientific discussion rigorous and calm.',
    toggles: [
      { key: 'allowComments', label: 'Allow comments from everyone', help: 'Permit public replies on your posts and reels.' },
      { key: 'hideOffensive', label: 'Hide offensive language', help: 'Filter comments that are likely abusive or irrelevant.' },
      { key: 'pinPeerReview', label: 'Pin peer-review comments', help: 'Surface high-signal critique near the top.' },
    ]
  },
  sharing: {
    title: 'Sharing',
    description: 'Decide where your research content can travel.',
    toggles: [
      { key: 'allowExternalSharing', label: 'Allow external sharing', help: 'Let people share your content outside ResearchReel.' },
      { key: 'allowRemix', label: 'Allow reel remixes', help: 'Let others build educational reels from your public posts.' },
      { key: 'attachAttribution', label: 'Attach attribution by default', help: 'Include your profile and DOI links when posts are shared.' },
    ]
  },
  restricted: {
    title: 'Restricted accounts',
    description: 'Limit disruptive accounts without a public block signal.',
    toggles: [
      { key: 'restrictedMode', label: 'Enable restricted mode', help: 'Move restricted replies into a private review queue.' },
      { key: 'autoRestrictNewAccounts', label: 'Auto-restrict new accounts', help: 'Quiet brand-new accounts until trust signals improve.' },
    ]
  },
  content_pref: {
    title: 'Content preferences',
    description: 'Shape the feed toward the work you actually want to read.',
    toggles: [
      { key: 'prioritizePeerReviewed', label: 'Prioritize peer-reviewed content', help: 'Rank reviewed papers and replication notes higher.' },
      { key: 'showTrendingTopics', label: 'Show trending topics', help: 'Include fast-moving research themes in Explore.' },
      { key: 'reduceViralPosts', label: 'Reduce viral-only posts', help: 'Down-rank posts with weak scholarly context.' },
    ]
  },
  like_counts: {
    title: 'Like and share counts',
    description: 'Let metrics inform you without steering the whole experience.',
    toggles: [
      { key: 'hideLikeCounts', label: 'Hide like counts on your posts', help: 'Show engagement privately in analytics only.' },
      { key: 'hideShareCounts', label: 'Hide share counts', help: 'Keep public post cards focused on the work.' },
    ]
  },
  creator_subs: {
    title: 'Creator subscriptions',
    description: 'Offer deeper courses, walkthroughs, and lab explainers.',
    toggles: [
      { key: 'enableSubscriptions', label: 'Enable subscriptions', help: 'Create subscriber-only research tutorials.' },
      { key: 'showSubscriberBadge', label: 'Show subscriber badge', help: 'Mark paid supporters in comments and messages.' },
    ]
  },
  archiving: {
    title: 'Archiving and downloading',
    description: 'Keep local copies of posts, reels, and publication imports.',
    toggles: [
      { key: 'saveOriginals', label: 'Save original media', help: 'Store uploaded source files before compression.' },
      { key: 'savePostedReels', label: 'Save posted reels', help: 'Keep a copy of finished reels in your archive.' },
      { key: 'includeMetadata', label: 'Include metadata exports', help: 'Export DOI, ORCID, citation, and caption metadata.' },
    ]
  },
  accessibility: {
    title: 'Accessibility',
    description: 'Make dense research interfaces easier to scan and understand.',
    toggles: [
      { key: 'highContrast', label: 'High contrast mode', help: 'Increase text and border contrast across the app.' },
      { key: 'autoCaptions', label: 'Auto-generated captions', help: 'Show generated captions for reels and lectures.' },
      { key: 'reduceMotion', label: 'Reduce motion', help: 'Minimize animations and animated page transitions.' },
    ]
  },
  supervision: {
    title: 'Lab supervision',
    description: 'Coordinate student accounts, lab assistants, and approval flows.',
    toggles: [
      { key: 'supervisionTools', label: 'Enable supervision tools', help: 'Review drafts and imports from supervised accounts.' },
      { key: 'approvalBeforePublish', label: 'Require approval before publish', help: 'Hold supervised posts until a lead researcher approves them.' },
    ]
  },
};

const defaultPreferences: Preferences = {
  toggles: {
    newFollowers: true,
    paperCitations: true,
    directMessages: true,
    mentions: true,
    allowComments: true,
    hideOffensive: true,
    attachAttribution: true,
    prioritizePeerReviewed: true,
    showTrendingTopics: true,
    savePostedReels: true,
    autoCaptions: true,
    showOrcidBadge: true,
    accountSuggestions: true,
  },
  language: 'English',
  accountType: 'Scholar',
  websiteAccess: 'Ask every time',
  hiddenWords: 'predatory journal, spam, fake citation',
  blockedQuery: '',
  mutedQuery: '',
};

function ToggleRow({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] p-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--foreground)]">{label}</div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">{help}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-zinc-600/70'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-[21px]' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  );
}

function SelectablePill({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 items-center justify-center gap-2 rounded-lg border px-4 text-xs font-bold transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-500/12 text-indigo-400'
          : 'border-[var(--border)]/15 bg-[var(--foreground)]/[0.03] text-zinc-500 hover:text-[var(--foreground)]'
      }`}
    >
      {active && <Check size={14} />}
      {label}
    </button>
  );
}

export default function SettingsModal({ isOpen, onClose, initialTab = 'edit_profile' }: SettingsModalProps) {
  const { user: authUser } = useAuth();
  const { profiles, updateProfile } = useSocial();
  const { theme, setTheme } = useTheme();
  const currentProfile = authUser ? profiles[authUser.username] : undefined;
  const buildProfileForm = (): ProfileForm => ({
    fullName: currentProfile?.full_name || authUser?.full_name || authUser?.username || '',
    username: authUser?.username || '',
    website: currentProfile?.orcid_id ? `https://orcid.org/${currentProfile.orcid_id}` : '',
    bio: currentProfile?.bio || '',
    orcid: currentProfile?.orcid_id || '',
    institution: currentProfile?.institution_name || '',
    interests: currentProfile?.research_interests?.join(', ') || '',
    title: 'Scholar',
  });
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [showMenu, setShowMenu] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saved'>('idle');
  const [profileForm, setProfileForm] = useState<ProfileForm>(() => buildProfileForm());
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === 'undefined') return defaultPreferences;
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultPreferences;
    try {
      const parsed = JSON.parse(saved) as Preferences;
      return {
        ...defaultPreferences,
        ...parsed,
        toggles: { ...defaultPreferences.toggles, ...parsed.toggles },
      };
    } catch {
      return defaultPreferences;
    }
  });
  const selectedMenuItem = menuSections.flatMap(section => section.items).find(item => item.id === activeTab);

  const searchableAccounts = useMemo(
    () => Object.values(profiles).filter(profile => profile.username !== authUser?.username).slice(0, 8),
    [authUser?.username, profiles]
  );

  useEffect(() => {
    if (!isOpen) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [isOpen, preferences]);

  if (!isOpen) return null;

  if (authUser && profileForm.username !== authUser.username) {
    setProfileForm({ ...buildProfileForm(), title: preferences.accountType });
  }

  const updateToggle = (key: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      toggles: {
        ...prev.toggles,
        [key]: checked,
      }
    }));
  };

  const saveProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authUser) return;

    updateProfile(authUser.username, {
      full_name: profileForm.fullName.trim(),
      bio: profileForm.bio.trim(),
      orcid_id: profileForm.orcid.trim(),
      institution_name: profileForm.institution.trim(),
      research_interests: profileForm.interests.split(',').map(interest => interest.trim()).filter(Boolean),
    });
    setPreferences(prev => ({ ...prev, accountType: profileForm.title }));
    setSaveState('saved');
    window.setTimeout(() => setSaveState('idle'), 2400);
  };

  const renderEditProfile = () => (
    <form onSubmit={saveProfile} className="mx-auto max-w-2xl space-y-6">
      <div className="hidden md:block">
        <h2 className="text-2xl font-bold tracking-tight">Edit profile</h2>
        <p className="mt-1 text-sm text-zinc-500">Keep your public research identity precise, readable, and credible.</p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-500/12 text-lg font-black text-indigo-400">
            {profileForm.fullName.slice(0, 1) || 'R'}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-bold">{profileForm.username}</div>
            <div className="truncate text-xs text-zinc-500">{profileForm.fullName}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => updateToggle('customAvatarReady', true)}
          className="h-9 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white transition-colors hover:bg-indigo-500"
        >
          Change photo
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-bold text-zinc-500">Name</span>
          <input
            value={profileForm.fullName}
            onChange={event => setProfileForm(prev => ({ ...prev, fullName: event.target.value }))}
            className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-bold text-zinc-500">ORCID ID</span>
          <input
            value={profileForm.orcid}
            onChange={event => setProfileForm(prev => ({ ...prev, orcid: event.target.value }))}
            placeholder="0000-0002-1825-0097"
            className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
          />
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-zinc-500">Website</span>
        <input
          type="url"
          value={profileForm.website}
          onChange={event => setProfileForm(prev => ({ ...prev, website: event.target.value }))}
          placeholder="https://lab.example.edu/profile"
          className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-zinc-500">Bio</span>
        <div className="relative">
          <textarea
            value={profileForm.bio}
            onChange={event => setProfileForm(prev => ({ ...prev, bio: event.target.value.slice(0, 220) }))}
            rows={4}
            placeholder="Describe your research focus, lab, and current work."
            className="w-full resize-none rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 py-3 pr-16 text-sm leading-relaxed outline-none transition-colors focus:border-indigo-500"
          />
          <span className="absolute bottom-3 right-3 text-xs text-zinc-500">{profileForm.bio.length} / 220</span>
        </div>
      </label>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-bold text-zinc-500">Institution</span>
          <input
            value={profileForm.institution}
            onChange={event => setProfileForm(prev => ({ ...prev, institution: event.target.value }))}
            className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-bold text-zinc-500">Academic title</span>
          <select
            value={profileForm.title}
            onChange={event => setProfileForm(prev => ({ ...prev, title: event.target.value }))}
            className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
          >
            <option>Scholar</option>
            <option>Professor</option>
            <option>Postdoctoral researcher</option>
            <option>PhD candidate</option>
            <option>Independent researcher</option>
            <option>Institutional lab</option>
          </select>
        </label>
      </div>

      <label className="block space-y-2">
        <span className="text-xs font-bold text-zinc-500">Research interests</span>
        <input
          value={profileForm.interests}
          onChange={event => setProfileForm(prev => ({ ...prev, interests: event.target.value }))}
          placeholder="Quantum systems, Bioinformatics, AI safety"
          className="h-11 w-full rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 text-sm outline-none transition-colors focus:border-indigo-500"
        />
      </label>

      <div className="space-y-3">
        <ToggleRow
          label="Show ORCID badge"
          help="Display a verified research identity badge on your profile."
          checked={Boolean(preferences.toggles.showOrcidBadge)}
          onChange={checked => updateToggle('showOrcidBadge', checked)}
        />
        <ToggleRow
          label="AI assisted research label"
          help="Add context when your publications rely heavily on AI methods."
          checked={Boolean(preferences.toggles.aiAssistedResearch)}
          onChange={checked => updateToggle('aiAssistedResearch', checked)}
        />
        <ToggleRow
          label="Show account suggestions on profiles"
          help="Let people discover similar researchers from your profile."
          checked={Boolean(preferences.toggles.accountSuggestions)}
          onChange={checked => updateToggle('accountSuggestions', checked)}
        />
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-[var(--border)]/10 pt-5">
        <div className="min-h-5 text-xs font-bold text-emerald-500">
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 size={15} />
              Profile saved
            </span>
          )}
        </div>
        <button type="submit" className="h-10 rounded-lg bg-indigo-600 px-8 text-sm font-bold text-white transition-colors hover:bg-indigo-500">
          Submit
        </button>
      </div>
    </form>
  );

  const renderTogglePanel = (tab: SettingsTab) => {
    const panel = panelCopy[tab];
    if (!panel) return null;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{panel.title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{panel.description}</p>
        </div>
        <div className="space-y-3">
          {panel.toggles.map(toggle => (
            <ToggleRow
              key={toggle.key}
              label={toggle.label}
              help={toggle.help}
              checked={Boolean(preferences.toggles[toggle.key])}
              onChange={checked => updateToggle(toggle.key, checked)}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderAccountListPanel = (kind: 'blocked' | 'muted') => {
    const queryKey = kind === 'blocked' ? 'blockedQuery' : 'mutedQuery';
    const activeKey = kind === 'blocked' ? 'blockedAccounts' : 'mutedAccounts';
    const query = preferences[queryKey].toLowerCase();
    const matches = searchableAccounts.filter(account => {
      const haystack = `${account.username} ${account.full_name} ${account.institution_name}`.toLowerCase();
      return haystack.includes(query);
    });

    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{kind === 'blocked' ? 'Blocked accounts' : 'Muted accounts'}</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {kind === 'blocked'
              ? 'Blocked researchers cannot follow, message, or mention you.'
              : 'Muted researchers stay connected, but their posts are hidden from your feed.'}
          </p>
        </div>
        <label className="flex h-11 items-center gap-2 rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3">
          <Search size={16} className="text-zinc-500" />
          <input
            value={preferences[queryKey]}
            onChange={event => setPreferences(prev => ({ ...prev, [queryKey]: event.target.value }))}
            placeholder={`Search accounts to ${kind === 'blocked' ? 'block' : 'mute'}`}
            className="h-full flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <div className="space-y-3">
          {matches.map(account => {
            const key = `${activeKey}.${account.username}`;
            const active = Boolean(preferences.toggles[key]);
            return (
              <div key={account.username} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-black text-indigo-400">
                    {account.full_name.slice(0, 1)}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{account.username}</div>
                    <div className="truncate text-xs text-zinc-500">{account.full_name}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => updateToggle(key, !active)}
                  className={`h-9 rounded-lg px-4 text-xs font-bold transition-colors ${
                    active ? 'bg-red-500/12 text-red-400 hover:bg-red-500/20' : 'bg-[var(--foreground)]/8 hover:bg-[var(--foreground)]/12'
                  }`}
                >
                  {active ? (kind === 'blocked' ? 'Blocked' : 'Muted') : (kind === 'blocked' ? 'Block' : 'Mute')}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderHiddenWords = () => (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hidden words</h2>
        <p className="mt-1 text-sm text-zinc-500">Filter comments and message requests that contain noisy or unwanted terms.</p>
      </div>
      <label className="block space-y-2">
        <span className="text-xs font-bold text-zinc-500">Words and phrases</span>
        <textarea
          value={preferences.hiddenWords}
          onChange={event => setPreferences(prev => ({ ...prev, hiddenWords: event.target.value }))}
          rows={5}
          className="w-full resize-none rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.035] px-3 py-3 text-sm outline-none transition-colors focus:border-indigo-500"
        />
      </label>
      <ToggleRow
        label="Hide comments with custom words"
        help="Apply this list to comments, reels, and message requests."
        checked={Boolean(preferences.toggles.hideCustomWords)}
        onChange={checked => updateToggle('hideCustomWords', checked)}
      />
    </div>
  );

  const renderLanguage = () => (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Language</h2>
        <p className="mt-1 text-sm text-zinc-500">Set translation behavior for papers, captions, and interface text.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {['English', 'Hindi', 'Spanish', 'French', 'German', 'Japanese'].map(language => (
          <SelectablePill
            key={language}
            label={language}
            active={preferences.language === language}
            onClick={() => setPreferences(prev => ({ ...prev, language }))}
          />
        ))}
      </div>
      <ToggleRow
        label="Translate papers automatically"
        help="Offer inline translation for abstracts and captions when available."
        checked={Boolean(preferences.toggles.translatePapers)}
        onChange={checked => updateToggle('translatePapers', checked)}
      />
    </div>
  );

  const renderWebsitePermissions = () => (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Website permissions</h2>
        <p className="mt-1 text-sm text-zinc-500">Manage integrations that read publication and identity metadata.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {['Ask every time', 'Allow trusted sites', 'Block all'].map(option => (
          <SelectablePill
            key={option}
            label={option}
            active={preferences.websiteAccess === option}
            onClick={() => setPreferences(prev => ({ ...prev, websiteAccess: option }))}
          />
        ))}
      </div>
      <ToggleRow label="Crossref integration" help="Allow DOI lookups and citation enrichment." checked={Boolean(preferences.toggles.crossref)} onChange={checked => updateToggle('crossref', checked)} />
      <ToggleRow label="ORCID sync" help="Use ORCID to refresh public profile metadata." checked={Boolean(preferences.toggles.orcidSync)} onChange={checked => updateToggle('orcidSync', checked)} />
    </div>
  );

  const renderAccountType = () => (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Account type and tools</h2>
        <p className="mt-1 text-sm text-zinc-500">Choose the toolset that best matches how you publish and collaborate.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {['Scholar', 'Professional', 'Institutional lab'].map(type => (
          <SelectablePill
            key={type}
            label={type}
            active={preferences.accountType === type}
            onClick={() => {
              setPreferences(prev => ({ ...prev, accountType: type }));
              setProfileForm(prev => ({ ...prev, title: type }));
            }}
          />
        ))}
      </div>
      <ToggleRow label="Advanced analytics" help="Show profile, citation, and reel performance dashboards." checked={Boolean(preferences.toggles.advancedAnalytics)} onChange={checked => updateToggle('advancedAnalytics', checked)} />
      <ToggleRow label="Collaboration intake" help="Add a structured request form to your profile." checked={Boolean(preferences.toggles.collaborationIntake)} onChange={checked => updateToggle('collaborationIntake', checked)} />
    </div>
  );

  const renderVerified = () => (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-16 text-center">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/12 text-blue-400">
        <BadgeCheck size={42} />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">ResearchReel Verified</h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
        Establish identity, protect your account, and make your research profile easier to trust.
      </p>
      <button
        type="button"
        onClick={() => updateToggle('verifiedWaitlist', true)}
        className="mt-7 inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white transition-colors hover:bg-blue-500"
      >
        {preferences.toggles.verifiedWaitlist ? <Check size={16} /> : <Sparkles size={16} />}
        {preferences.toggles.verifiedWaitlist ? 'Joined waitlist' : 'Join waitlist'}
      </button>
    </div>
  );

  const renderThemeStrip = () => (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)]/15 bg-[var(--foreground)]/[0.025] p-2">
      <span className="px-2 text-xs font-bold text-zinc-500">Appearance</span>
      <SelectablePill active={theme === 'black'} label="Dark" onClick={() => setTheme('black')} />
      <SelectablePill active={theme === 'white'} label="Light" onClick={() => setTheme('white')} />
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'edit_profile') return renderEditProfile();
    if (activeTab === 'blocked') return renderAccountListPanel('blocked');
    if (activeTab === 'muted') return renderAccountListPanel('muted');
    if (activeTab === 'hidden_words') return renderHiddenWords();
    if (activeTab === 'language') return renderLanguage();
    if (activeTab === 'website_perms') return renderWebsitePermissions();
    if (activeTab === 'account_type') return renderAccountType();
    if (activeTab === 'verified') return renderVerified();
    return renderTogglePanel(activeTab);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 p-0 backdrop-blur-sm md:p-8">
      <button type="button" aria-label="Close settings" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div className="relative z-10 flex h-full w-full max-w-[1040px] overflow-hidden border border-[var(--border)]/15 bg-[var(--background)] shadow-2xl md:h-[86vh] md:rounded-lg">
        <aside className={`${showMenu ? 'flex' : 'hidden'} w-full flex-col border-r border-[var(--border)]/10 md:flex md:w-[312px]`}>
          <div className="flex h-16 items-center justify-between border-b border-[var(--border)]/10 px-5">
            <h2 className="text-xl font-bold tracking-tight">Settings</h2>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)] md:hidden">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-4">
            {menuSections.map((section, index) => (
              <div key={section.title || index} className="space-y-1">
                {section.title && <div className="px-3 py-1 text-[11px] font-bold text-zinc-500">{section.title}</div>}
                {section.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id);
                        setShowMenu(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive ? 'bg-[var(--foreground)]/10 text-[var(--foreground)]' : 'text-zinc-500 hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)]'
                      }`}
                    >
                      <Icon size={18} />
                      <span className="min-w-0 truncate font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <section className={`${showMenu ? 'hidden' : 'flex'} min-w-0 flex-1 flex-col md:flex`}>
          <header className="flex h-16 items-center justify-between border-b border-[var(--border)]/10 px-4 md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setShowMenu(true)} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)] md:hidden">
                <ChevronLeft size={20} />
              </button>
              {selectedMenuItem && (
                <>
                  <selectedMenuItem.icon size={18} className="hidden text-zinc-500 sm:block" />
                  <h2 className="truncate text-base font-bold">{selectedMenuItem.label}</h2>
                </>
              )}
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)]">
              <X size={20} />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {renderThemeStrip()}
            {renderContent()}
            <div className="mt-8 flex justify-end">
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)]/15 bg-[var(--foreground)]/[0.03] px-3 py-1.5 text-xs text-zinc-500">
                <SlidersHorizontal size={13} />
                Preferences save automatically
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
