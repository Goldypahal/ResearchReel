"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { lectures, type Lecture } from '@/lib/lectures';
import {
  Award,
  BookOpen,
  ChevronRight,
  Clock,
  Filter,
  GraduationCap,
  Hand,
  Mic,
  MicOff,
  Plus,
  Radio,
  ShieldCheck,
  Users,
  Video,
} from 'lucide-react';

const TOPIC_FILTERS = ['All', 'Physics', 'Biology', 'AI & Medicine', 'Astrophysics', 'Mathematics'];
const STATUS_FILTERS = ['All', 'Live Now', 'Scheduled', 'Ended'];

function getStatusLabel(status: Lecture['status']) {
  if (status === 'live') return 'LIVE';
  if (status === 'scheduled') return 'UPCOMING';
  return 'REPLAY';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function LecturesPage() {
  const { user } = useAuth();
  const [topicFilter, setTopicFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const isProfessor = user?.role === 'professor' || user?.role === 'scholar';
  const liveLectures = lectures.filter((lecture) => lecture.status === 'live').length;
  const activeAttendees = lectures.reduce((sum, lecture) => sum + lecture.attendees, 0);

  const filtered = lectures.filter((lecture) => {
    const topicMatch = topicFilter === 'All' || lecture.topic.toLowerCase().includes(topicFilter.toLowerCase());
    const statusMatch =
      statusFilter === 'All' ||
      (statusFilter === 'Live Now' && lecture.status === 'live') ||
      (statusFilter === 'Scheduled' && lecture.status === 'scheduled') ||
      (statusFilter === 'Ended' && lecture.status === 'ended');
    return topicMatch && statusMatch;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="border-b border-[var(--border)] bg-[var(--foreground)]/[0.03]">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-400">
              <BookOpen size={16} />
              Academic Lecture Halls
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              Attend moderated lectures from leading scientists and educators.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--foreground)]/62">
              A modern live classroom with the discipline of old academic halls: one presenter leads, selected
              professors and scientists can comment, and students attend with permission-based speaking.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Metric icon={Radio} label="Live halls" value={String(liveLectures)} tone="text-red-400" />
              <Metric icon={Users} label="Attending" value={activeAttendees.toLocaleString()} tone="text-emerald-400" />
              <Metric icon={ShieldCheck} label="Moderation" value="Host controlled" tone="text-cyan-400" />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--foreground)]/40">Lecture protocol</p>
                <h2 className="mt-1 text-lg font-bold">Presenter grants the floor</h2>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/12 text-cyan-300">
                <Mic size={20} />
              </div>
            </div>
            <div className="grid gap-3">
              <Protocol icon={Video} title="Main lecture stream" text="The educator or scientist remains pinned as the primary speaker." />
              <Protocol icon={MicOff} title="Students enter muted" text="Students can attend, react, and request speaking permission." />
              <Protocol icon={Hand} title="Permission queue" text="The presenter promotes only selected people to ask or answer." />
              <Protocol icon={GraduationCap} title="Expert commentary" text="Professors and scientists can add moderated notes during the lecture." />
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-14 z-30 border-b border-[var(--border)] bg-[var(--background)]/92 backdrop-blur-xl md:top-0">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3">
          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-[var(--foreground)]/40" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--foreground)]/40">Status</span>
          </div>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === filter
                  ? 'bg-cyan-500 text-black'
                  : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/10'
              }`}
            >
              {filter}
            </button>
          ))}
          <div className="mx-1 h-4 w-px bg-[var(--border)]" />
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {TOPIC_FILTERS.map((filter) => (
              <button
                key={filter}
                onClick={() => setTopicFilter(filter)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  topicFilter === filter
                    ? 'bg-emerald-500 text-black'
                    : 'bg-[var(--foreground)]/5 text-[var(--foreground)]/60 hover:bg-[var(--foreground)]/10'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
          {isProfessor && (
            <Link
              href="/lectures/host"
              className="ml-auto flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-3 py-2 text-xs font-bold text-[var(--background)] transition-transform active:scale-95"
            >
              <Plus size={15} />
              Host
            </Link>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((lecture) => (
            <LectureCard key={lecture.id} lecture={lecture} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-24 text-center text-[var(--foreground)]/35">
            <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No lectures match your filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3">
      <Icon size={18} className={tone} />
      <div>
        <p className="text-sm font-black">{value}</p>
        <p className="text-xs text-[var(--foreground)]/45">{label}</p>
      </div>
    </div>
  );
}

function Protocol({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ElementType;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-[var(--border)] bg-[var(--foreground)]/[0.03] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--foreground)]/7">
        <Icon size={17} />
      </div>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-[var(--foreground)]/50">{text}</p>
      </div>
    </div>
  );
}

function LectureCard({ lecture }: { lecture: Lecture }) {
  const statusClass =
    lecture.status === 'live'
      ? 'border-red-500/25 bg-red-500/[0.04]'
      : lecture.status === 'scheduled'
        ? 'border-amber-500/25 bg-amber-500/[0.04]'
        : 'border-[var(--border)] bg-[var(--foreground)]/[0.025]';

  return (
    <Link
      href={`/lectures/${lecture.id}`}
      className={`group flex min-h-[320px] flex-col rounded-2xl border p-5 transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 ${statusClass}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
            lecture.status === 'live'
              ? 'bg-red-500/20 text-red-300'
              : lecture.status === 'scheduled'
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-zinc-500/20 text-zinc-300'
          }`}
        >
          {lecture.status === 'live' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-400" />}
          {getStatusLabel(lecture.status)}
        </div>
        <span className="rounded-full bg-[var(--foreground)]/5 px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/45">
          {lecture.topic}
        </span>
      </div>

      <h3 className="text-lg font-black leading-snug transition-colors group-hover:text-cyan-300">{lecture.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--foreground)]/52">{lecture.description}</p>

      <div className="my-5 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/14 text-sm font-black text-cyan-300">
          {lecture.presenter[0]}
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-sm font-bold">
            {lecture.presenter}
            <Award size={13} className="text-amber-400" />
          </p>
          <p className="text-xs text-[var(--foreground)]/42">{lecture.presenterRole}</p>
        </div>
      </div>

      <div className="mb-5 grid gap-2 sm:grid-cols-2">
        <SmallStat icon={Mic} label={`${lecture.speakersAllowed} speaker seats`} />
        <SmallStat icon={ShieldCheck} label={lecture.format} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1.5">
        {lecture.tags.map((tag) => (
          <span key={tag} className="rounded-md bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">
            {tag}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-4">
        <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--foreground)]/50">
          <span className="flex items-center gap-1">
            <Users size={12} />
            {lecture.status === 'live'
              ? `${lecture.attendees.toLocaleString()} attending`
              : lecture.status === 'ended'
                ? `${lecture.attendees.toLocaleString()} attended`
                : 'Register'}
          </span>
          {lecture.scheduledAt && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(lecture.scheduledAt)}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-cyan-300 transition-all group-hover:gap-2">
          {lecture.status === 'live' ? 'Join hall' : lecture.status === 'scheduled' ? 'Preview' : 'Replay'}
          <ChevronRight size={14} />
        </span>
      </div>
    </Link>
  );
}

function SmallStat({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex min-h-10 items-center gap-2 rounded-lg bg-[var(--foreground)]/[0.04] px-3 text-xs text-[var(--foreground)]/55">
      <Icon size={13} className="shrink-0 text-[var(--foreground)]/38" />
      <span className="truncate">{label}</span>
    </div>
  );
}
