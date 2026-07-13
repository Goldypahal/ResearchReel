"use client";

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export type TrackType = 'video' | 'audio' | 'subtitle';

export interface Clip {
  id: string;
  trackId: string;
  type: TrackType;
  startTime: number; // in seconds
  duration: number; // in seconds
  content: string; // text or url
}

export interface Track {
  id: string;
  type: TrackType;
  clips: Clip[];
}

export interface EditorState {
  tracks: Track[];
  currentTime: number;
  isPlaying: boolean;
  selectedClipId: string | null;
  duration: number;
}

// Initial State
const initialState: EditorState = {
  tracks: [
    { id: 'track-v1', type: 'video', clips: [] },
    { id: 'track-a1', type: 'audio', clips: [] },
    { id: 'track-s1', type: 'subtitle', clips: [] },
  ],
  currentTime: 0,
  isPlaying: false,
  selectedClipId: null,
  duration: 60, // 60 seconds default reel
};

// Actions
type Action =
  | { type: 'SET_TIME'; payload: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SELECT_CLIP'; payload: string | null }
  | { type: 'ADD_CLIP'; payload: Clip }
  | { type: 'UPDATE_CLIP_TIME'; payload: { id: string; startTime: number; duration: number } };

// Reducer
function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_TIME':
      return { ...state, currentTime: action.payload };
    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };
    case 'SELECT_CLIP':
      return { ...state, selectedClipId: action.payload };
    case 'ADD_CLIP': {
      const newTracks = state.tracks.map(t => {
        if (t.id === action.payload.trackId) {
          return { ...t, clips: [...t.clips, action.payload] };
        }
        return t;
      });
      return { ...state, tracks: newTracks };
    }
    case 'UPDATE_CLIP_TIME': {
      const newTracks = state.tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => 
          c.id === action.payload.id 
            ? { ...c, startTime: action.payload.startTime, duration: action.payload.duration } 
            : c
        )
      }));
      return { ...state, tracks: newTracks };
    }
    default:
      return state;
  }
}

// Context
const EditorContext = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);
  if (!context) throw new Error('useEditor must be used within EditorProvider');
  return context;
}
