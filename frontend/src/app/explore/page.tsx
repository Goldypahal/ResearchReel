"use client";

import React, { useState } from 'react';
import Image from 'next/image';

const MOCK_EXPLORE_ITEMS = [
  { id: 1, type: 'reel', size: 'large', url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80', views: '1.2M', user: 'quantum_lab', caption: 'Visualizing quantum entanglement in real-time. #Physics #Science', likes: '92k', comments: 420 },
  { id: 2, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1507413245164-6160d8298b31?auto=format&fit=crop&w=400&q=80', user: 'bio_tech', caption: 'The future of CRISPR is here.', likes: '15k', comments: 88 },
  { id: 3, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=400&q=80', user: 'robotics_now', caption: 'Haptic feedback systems for remote surgery.', likes: '24k', comments: 142 },
  { id: 4, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1614935151651-0bea6508ab6b?auto=format&fit=crop&w=400&q=80', user: 'astro_sarah', caption: 'Mars Rover latest captures.', likes: '8k', comments: 64 },
  { id: 5, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=400&q=80', user: 'lab_rat', caption: 'Crystal growth under microgravity.', likes: '31k', comments: 198 },
  { id: 6, type: 'reel', size: 'large', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80', views: '840k', user: 'chem_world', caption: 'Oddly satisfying chemical reactions.', likes: '76k', comments: 310 },
  { id: 7, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?auto=format&fit=crop&w=400&q=80', user: 'deep_sea', caption: 'Bioluminescent life at 3000m.', likes: '42k', comments: 280 },
  { id: 8, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&w=400&q=80', user: 'genetics_plus', caption: 'Sequencing the unsequencable.', likes: '19k', comments: 112 },
  { id: 9, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1574169208507-84376144848b?auto=format&fit=crop&w=400&q=80', user: 'neural_net', caption: 'Brain-computer interface calibration.', likes: '53k', comments: 389 },
  { id: 10, type: 'post', size: 'small', url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=400&q=80', user: 'green_energy', caption: 'Solar panel efficiency record broken.', likes: '67k', comments: 295 },
];

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedPost, setSelectedPost] = useState<typeof MOCK_EXPLORE_ITEMS[0] | null>(null);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] w-full">
      <main className="max-w-[935px] mx-auto px-4 md:px-0 pt-6 pb-24">
        
        {/* Instagram-style Search Header */}
        <div className="w-full mb-6 relative hidden md:block">
           <input 
             type="text" 
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             placeholder="Search"
             className="w-full bg-[var(--foreground)]/5 border border-[var(--border)]/10 rounded-lg px-4 py-2 text-sm text-[var(--foreground)] placeholder-zinc-400 focus:outline-none focus:ring-0"
           />
        </div>

        {/* Explore Grid */}
        <div className="grid grid-cols-3 gap-1 md:gap-4">
          {MOCK_EXPLORE_ITEMS.map((item) => {
            const isLarge = item.size === 'large';
            
            return (
              <div 
                key={item.id} 
                onClick={() => setSelectedPost(item)}
                className={`relative group cursor-pointer overflow-hidden ${
                  isLarge ? 'col-span-1 row-span-2 aspect-[1/2]' : 'col-span-1 aspect-square'
                }`}
              >
                <Image src={item.url} alt="Explore content" fill className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                  <div className="flex items-center gap-2 font-bold">
                    <svg aria-label="Like" fill="white" height="20" viewBox="0 0 24 24" width="20"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.14 6.14 0 0 0-4.896 2.623 6.14 6.14 0 0 0-4.896-2.623C3.928 1.904.5 5.466.5 9.122c0 4.414 3.44 6.945 6.32 9.42 2.4 2.062 4.1 3.52 4.8 4.1.2.1.5.2.8.2.3 0 .6-.1.8-.2.7-.6 2.4-2.038 4.8-4.1 2.88-2.475 6.32-5.006 6.32-9.42 0-3.656-3.428-7.218-6.648-7.218Z"></path></svg>
                    <span>{item.likes}</span>
                  </div>
                  <div className="flex items-center gap-2 font-bold">
                    <svg aria-label="Comment" fill="white" height="20" viewBox="0 0 24 24" width="20"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="white" strokeLinejoin="round" strokeWidth="2"></path></svg>
                    <span>{item.comments}</span>
                  </div>
                </div>

                {item.type === 'reel' && (
                  <div className="absolute top-2 right-2 text-white drop-shadow-md">
                    <svg aria-label="Reel" fill="currentColor" height="20" viewBox="0 0 24 24" width="20"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22.5C6.206 22.5 1.5 17.794 1.5 12S6.206 1.5 12 1.5 22.5 6.206 22.5 12 17.794 22.5 12 22.5zm5-11.371-8 5A.826.826 0 0 1 8 15.428V8.571a.826.826 0 0 1 1.25-.7l8 5a.828.828 0 0 1 0 1.414z"></path></svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Post Modal - Instagram Style */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedPost(null)}></div>
          
          <button className="absolute top-4 right-4 text-white text-3xl z-10 hover:scale-110 transition-transform" onClick={() => setSelectedPost(null)}>✕</button>

          <div className="relative bg-[var(--background)] w-full max-w-[1200px] h-[85vh] md:h-auto md:aspect-[16/9] flex flex-col md:flex-row overflow-y-auto md:overflow-hidden rounded-xl animate-in fade-in zoom-in duration-300 border border-[var(--border)]/20 shadow-2xl">
             {/* Media Area */}
             <div className="flex-1 bg-black/5 flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-0 relative">
                <Image src={selectedPost.url} alt="Post content" fill className="object-contain" />
             </div>

             {/* Sidebar Info */}
             <div className="w-full md:w-[400px] bg-[var(--background)] border-t md:border-t-0 md:border-l border-[var(--border)]/10 flex flex-col shrink-0">
                {/* User Header */}
                <div className="p-4 border-b border-[var(--border)]/10 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800"></div>
                      <span className="text-sm font-bold">{selectedPost.user}</span>
                      <span className="text-blue-500 font-bold">•</span>
                      <button className="text-blue-500 text-sm font-bold hover:text-white transition-colors">Follow</button>
                   </div>
                   <button className="text-white">•••</button>
                </div>

                {/* Comments / Caption */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                   <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0"></div>
                      <div>
                         <p className="text-sm">
                            <span className="font-bold mr-2">{selectedPost.user}</span>
                            {selectedPost.caption}
                         </p>
                         <p className="text-xs text-zinc-500 mt-2">2h</p>
                      </div>
                   </div>

                   {/* Mock Comments */}
                   {[1, 2, 3].map(i => (
                     <div key={i} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 shrink-0"></div>
                        <div>
                           <p className="text-sm">
                              <span className="font-bold mr-2">scholar_{i}</span>
                              Excellent work on this research! The implications are huge.
                           </p>
                           <div className="flex items-center gap-3 mt-2">
                              <span className="text-xs text-zinc-500">4h</span>
                              <span className="text-xs font-bold text-zinc-500">12 likes</span>
                              <span className="text-xs font-bold text-zinc-500">Reply</span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-[var(--border)]/10">
                   <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                         <button className="hover:text-zinc-400 transition-colors">
                            <svg aria-label="Like" height="24" viewBox="0 0 24 24" width="24"><path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938m0-2a6.14 6.14 0 0 0-4.896 2.623 6.14 6.14 0 0 0-4.896-2.623C3.928 1.904.5 5.466.5 9.122c0 4.414 3.44 6.945 6.32 9.42 2.4 2.062 4.1 3.52 4.8 4.1.2.1.5.2.8.2.3 0 .6-.1.8-.2.7-.6 2.4-2.038 4.8-4.1 2.88-2.475 6.32-5.006 6.32-9.42 0-3.656-3.428-7.218-6.648-7.218Z" fill="currentColor"></path></svg>
                         </button>
                         <button className="hover:text-zinc-400 transition-colors">
                            <svg aria-label="Comment" height="24" viewBox="0 0 24 24" width="24"><path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></path></svg>
                         </button>
                         <button className="hover:text-zinc-400 transition-colors">
                            <svg aria-label="Share Post" height="24" viewBox="0 0 24 24" width="24"><line fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" x1="22" x2="9.218" y1="3" y2="10.083"></line><polygon fill="none" points="11.698 20.334 22 3.001 2 3.001 9.218 10.084 11.698 20.334" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon></svg>
                         </button>
                      </div>
                      <button className="hover:text-zinc-400 transition-colors">
                         <svg aria-label="Save" height="24" viewBox="0 0 24 24" width="24"><polygon fill="none" points="20 21 12 13.44 4 21 4 3 20 3 20 21" stroke="currentColor" strokeLinejoin="round" strokeWidth="2"></polygon></svg>
                      </button>
                   </div>
                   <p className="text-sm font-bold">12,405 likes</p>
                   <p className="text-[10px] text-zinc-500 uppercase mt-1 tracking-wider">October 24, 2025</p>
                </div>

                {/* Add Comment */}
                <div className="p-4 border-t border-[var(--border)]/10 flex items-center gap-3">
                   <button className="text-xl">😊</button>
                   <input type="text" placeholder="Add a comment..." className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-zinc-500" />
                   <button className="text-blue-500 font-bold text-sm opacity-50">Post</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
