"use client";

import React from 'react';
import Image from 'next/image';

const MOCK_NOTIFICATIONS = [
  { id: 1, user: 'sarah_chen', avatar: 'https://i.pravatar.cc/150?u=b042581f4e29026024d', action: 'started following you.', time: '2h', type: 'follow' },
  { id: 2, user: 'alan_turing', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', action: 'liked your post.', time: '4h', type: 'like', postImg: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=100&q=80' },
  { id: 3, user: 'dr_emily', avatar: 'https://i.pravatar.cc/150?u=c042581f4e29026024d', action: 'commented: "Incredible breakthrough! 🧪"', time: '1d', type: 'comment' },
  { id: 4, user: 'marcus_v', avatar: 'https://i.pravatar.cc/150?u=d042581f4e29026024d', action: 'mentioned you in a post.', time: '2d', type: 'mention' },
  { id: 5, user: 'julianewton', avatar: 'https://i.pravatar.cc/150?u=e042581f4e29026024d', action: 'started following you.', time: '3d', type: 'follow' },
];

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] w-full">
      <main className="max-w-[600px] mx-auto px-4 pt-10 pb-24">
        <h1 className="text-2xl font-bold mb-8">Notifications</h1>

        <div className="space-y-6">
           <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">New</h2>
              <div className="flex items-center gap-4 p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl">
                 <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-xl">🚀</div>
                 <div className="flex-1">
                    <p className="text-sm"><span className="font-bold">System Update:</span> AI Patent analysis is now 2x faster.</p>
                    <span className="text-xs text-zinc-500">Just now</span>
                 </div>
              </div>
           </section>

           <section>
              <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-4">Earlier</h2>
              <div className="flex flex-col">
                {MOCK_NOTIFICATIONS.map((notif) => (
                  <div key={notif.id} className="flex items-center gap-4 py-4 border-b border-[var(--border)]/10 group cursor-pointer transition-colors hover:bg-[var(--foreground)]/5 px-2 rounded-xl">
                    <Image src={notif.avatar} alt={notif.user} width={48} height={48} className="w-12 h-12 rounded-full object-cover border border-[var(--border)]/20 shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-bold mr-1">{notif.user}</span>
                        <span className="text-[var(--foreground)] opacity-80">{notif.action}</span>
                        <span className="ml-2 text-zinc-500 text-xs font-medium">{notif.time}</span>
                      </p>
                    </div>
                    {notif.type === 'follow' ? (
                      <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all active:scale-95 shadow-md shadow-blue-600/20">
                        Follow Back
                      </button>
                    ) : notif.postImg ? (
                      <Image src={notif.postImg} alt="Post" width={40} height={40} className="w-10 h-10 object-cover rounded-md border border-[var(--border)]/10" />
                    ) : null}
                  </div>
                ))}
              </div>
           </section>
        </div>
      </main>
    </div>
  );
}
