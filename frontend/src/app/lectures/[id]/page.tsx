"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { getLectureById } from '@/lib/lectures';
import {
  ArrowLeft,
  BookOpen,
  Check,
  Clock,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Send,
  ShieldCheck,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';

export default function LectureRoomPage() {
  const params = useParams<{ id: string }>();
  const lecture = getLectureById(params.id);
  const [handRaised, setHandRaised] = useState(false);
  const [selectedSpeaker, setSelectedSpeaker] = useState(lecture?.speakingQueue[0] ?? '');
  const [commentDraft, setCommentDraft] = useState('');

  const activeSpeakers = useMemo(
    () => lecture?.participants.filter((participant) => participant.speaking) ?? [],
    [lecture],
  );

  if (!lecture) {
    notFound();
  }

  const isLive = lecture.status === 'live';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="border-b border-[var(--border)] bg-[var(--foreground)]/[0.03]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/lectures"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--background)] transition-colors hover:bg-[var(--foreground)]/5"
              aria-label="Back to lectures"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                    isLive ? 'bg-red-500/18 text-red-300' : 'bg-amber-500/18 text-amber-300'
                  }`}
                >
                  <Radio size={11} />
                  {isLive ? 'Live moderated hall' : lecture.status === 'scheduled' ? 'Scheduled hall' : 'Lecture replay'}
                </span>
                <span className="hidden text-xs text-[var(--foreground)]/42 sm:inline">{lecture.hall}</span>
              </div>
              <h1 className="truncate text-lg font-black md:text-2xl">{lecture.title}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Control icon={MicOff} label="Muted" active />
            <Control icon={VideoOff} label="Camera off" />
            <button
              onClick={() => setHandRaised((current) => !current)}
              className={`flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-bold transition-all active:scale-95 ${
                handRaised ? 'bg-amber-400 text-black' : 'bg-[var(--foreground)] text-[var(--background)]'
              }`}
            >
              {handRaised ? <Check size={16} /> : <Hand size={16} />}
              {handRaised ? 'Request sent' : 'Ask to speak'}
            </button>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-7xl gap-5 px-5 py-5 xl:grid-cols-[1fr_360px]">
        <section className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
            <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-[var(--border)] bg-zinc-950">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,47,73,0.45),rgba(5,150,105,0.18),rgba(0,0,0,0.88))]" />
              <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
                <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                  Presenter view
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-black text-white">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  LIVE
                </span>
              </div>
              <div className="relative flex h-full min-h-[360px] flex-col justify-end p-5">
                <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-4xl font-black text-white shadow-2xl backdrop-blur">
                  {lecture.presenter[0]}
                </div>
                <div className="max-w-2xl">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-cyan-200">
                    <Video size={16} />
                    {lecture.presenter}
                  </p>
                  <h2 className="text-2xl font-black leading-tight text-white md:text-4xl">{lecture.title}</h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">{lecture.description}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3">
              {activeSpeakers.map((speaker) => (
                <div
                  key={speaker.name}
                  className="flex min-h-[118px] flex-col justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-sm font-black text-emerald-300">
                      {speaker.name[0]}
                    </div>
                    <Mic size={16} className="text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{speaker.name}</p>
                    <p className="text-xs text-[var(--foreground)]/45">{speaker.role} · {speaker.affiliation}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.025] p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck size={16} className="text-cyan-300" />
                  Speaking is host controlled
                </p>
                <p className="mt-2 text-xs leading-5 text-[var(--foreground)]/50">{lecture.studentMode}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <InfoTile icon={Users} label="Students attending" value={lecture.attendees.toLocaleString()} />
            <InfoTile icon={Mic} label="Speaker seats" value={`${activeSpeakers.length}/${lecture.speakersAllowed}`} />
            <InfoTile icon={Clock} label="Format" value={lecture.format} />
          </div>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.025] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--foreground)]/38">Audience floor</p>
                <h2 className="mt-1 text-lg font-black">Speaking permission queue</h2>
              </div>
              <button className="flex min-h-10 items-center gap-2 rounded-lg bg-cyan-500 px-3 text-sm font-bold text-black">
                <MonitorUp size={16} />
                Grant floor
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {(lecture.speakingQueue.length ? lecture.speakingQueue : ['No current requests']).map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedSpeaker(name)}
                  className={`min-h-20 rounded-xl border p-3 text-left transition-all ${
                    selectedSpeaker === name
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-[var(--border)] bg-[var(--background)] hover:bg-[var(--foreground)]/5'
                  }`}
                >
                  <p className="text-sm font-bold">{name}</p>
                  <p className="mt-1 text-xs text-[var(--foreground)]/45">
                    {lecture.speakingQueue.length ? 'Waiting for presenter approval' : 'Students are listening silently'}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </section>

        <aside className="grid gap-5">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.025] p-4">
            <div className="mb-4 flex items-center gap-2">
              <MessageSquare size={17} className="text-cyan-300" />
              <h2 className="font-black">Expert comments</h2>
            </div>
            <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1 custom-scrollbar">
              {lecture.comments.map((comment) => (
                <div key={`${comment.author}-${comment.time}`} className="rounded-xl bg-[var(--background)] p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{comment.author}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]/34">
                      {comment.time}
                    </span>
                  </div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-emerald-300">{comment.role}</p>
                  <p className="text-xs leading-5 text-[var(--foreground)]/58">{comment.message}</p>
                </div>
              ))}
            </div>
            <form
              className="mt-4 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                setCommentDraft('');
              }}
            >
              <input
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                placeholder="Add a moderated comment"
                className="min-h-10 min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm outline-none focus:border-cyan-400"
              />
              <button className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)]">
                <Send size={15} />
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.025] p-4">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={17} className="text-amber-300" />
              <h2 className="font-black">Participants</h2>
            </div>
            <div className="grid gap-2">
              {lecture.participants.map((participant) => (
                <div key={participant.name} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--background)] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{participant.name}</p>
                    <p className="truncate text-xs text-[var(--foreground)]/42">
                      {participant.role} · {participant.affiliation}
                    </p>
                  </div>
                  {participant.speaking ? (
                    <Mic size={15} className="shrink-0 text-emerald-300" />
                  ) : (
                    <MicOff size={15} className="shrink-0 text-[var(--foreground)]/30" />
                  )}
                </div>
              ))}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function Control({
  icon: Icon,
  label,
  active = false,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`hidden min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold sm:flex ${
        active
          ? 'border-red-500/25 bg-red-500/10 text-red-300'
          : 'border-[var(--border)] bg-[var(--background)] text-[var(--foreground)]/60'
      }`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--foreground)]/[0.025] p-4">
      <Icon size={18} className="mb-4 text-cyan-300" />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--foreground)]/35">{label}</p>
      <p className="mt-1 truncate text-lg font-black">{value}</p>
    </div>
  );
}
