export interface Song {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100: string; // Used for album art
  previewUrl: string; // 30s audio preview or Full MP3 url
  trackTimeMillis?: number;
  releaseDate?: string;
  primaryGenreName?: string;
  isFullVersion?: boolean; // Flag to indicate if this is a full version from external API
  lyrics?: string; // Lyrics from external API
  source?: 'itunes' | 'netease'; // Origin of the song data
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  isLoading: boolean; // New state for buffering/fetching full version
  volume: number;
  progress: number; // 0-100
  duration: number; // seconds
  currentTime: number; // seconds
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}

export interface MusicSource {
  id: string;
  name: string;
  url: string; // Base URL or Search URL pattern
  isCustom: boolean;
  description?: string;
}

export enum ViewMode {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  LIBRARY = 'LIBRARY',
  RECENT = 'RECENT',
  LYRICS = 'LYRICS'
}