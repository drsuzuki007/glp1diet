import React, { useRef, useState } from "react";
import { Captions, Expand, Pause, Play, Save, Volume2, VolumeX } from "lucide-react";

type SavePayload = { positionSeconds: number; progressPercent: number };

type InlineLearningPlayerProps = {
  title: string;
  category: string;
  src: string;
  initialPositionSeconds?: number;
  initialProgressPercent?: number;
  canSaveProgress: boolean;
  isSavingProgress?: boolean;
  onSaveProgress?: (payload: SavePayload) => void;
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function InlineLearningPlayer({
  title,
  category,
  src,
  initialPositionSeconds = 0,
  initialProgressPercent = 0,
  canSaveProgress,
  isSavingProgress = false,
  onSaveProgress,
}: InlineLearningPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [playbackRate, setPlaybackRate] = useState("1");

  const progressPercent = duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : initialProgressPercent;

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try {
        await video.play();
      } catch {
        setIsPlaying(false);
      }
    } else {
      video.pause();
    }
  };

  const changeVolume = (nextVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = nextVolume;
    video.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextEnabled = !captionsEnabled;
    for (let index = 0; index < video.textTracks.length; index += 1) {
      video.textTracks[index]!.mode = nextEnabled ? "showing" : "disabled";
    }
    setCaptionsEnabled(nextEnabled);
  };

  const setRate = (nextRate: string) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = Number(nextRate);
    setPlaybackRate(nextRate);
  };

  const seek = (nextTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const enterFullscreen = async () => {
    const frame = videoRef.current?.closest(".inline-learning-player__frame") as HTMLElement | null;
    if (frame?.requestFullscreen) await frame.requestFullscreen();
  };

  return <section className="inline-learning-player" id="learning-player" aria-labelledby="learning-player-title">
    <div className="inline-learning-player__heading">
      <div><span className="eyebrow eyebrow--gold">LEARNING PLAYER</span><h2 id="learning-player-title">{canSaveProgress ? "学習プレーヤー" : "無料プレビュー"}</h2></div>
      <span className={`inline-learning-player__access ${canSaveProgress ? "is-active" : ""}`}>{canSaveProgress ? "加入中・進捗を保存できます" : "無料プレビュー"}</span>
    </div>
    <div className="inline-learning-player__frame">
      <video
        ref={videoRef}
        className="inline-learning-player__video"
        src={src}
        playsInline
        preload="metadata"
        aria-label={`${title}の${canSaveProgress ? "学習" : "無料プレビュー"}動画`}
        onLoadedMetadata={event => {
          const video = event.currentTarget;
          const safePosition = initialPositionSeconds > 0 && initialPositionSeconds < video.duration ? initialPositionSeconds : 0;
          video.currentTime = safePosition;
          setCurrentTime(safePosition);
          setDuration(video.duration);
          for (let index = 0; index < video.textTracks.length; index += 1) video.textTracks[index]!.mode = "disabled";
        }}
        onTimeUpdate={event => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onVolumeChange={event => { setVolume(event.currentTarget.volume); setIsMuted(event.currentTarget.muted); }}
      >
        <track kind="captions" srcLang="ja" label="日本語（補助字幕）" src="/learning-preview-ja.vtt" />
      </video>
      {!isPlaying && <button className="inline-learning-player__center-play" type="button" onClick={togglePlayback} aria-label="再生する"><Play size={28} fill="currentColor" /></button>}
      <div className="inline-learning-player__context"><span>{category}</span><strong>{title}</strong></div>
    </div>
    <div className="inline-learning-player__controls">
      <div className="inline-learning-player__timeline"><span>{formatTime(currentTime)}</span><input aria-label="再生位置" type="range" min="0" max={duration || 1} value={Math.min(currentTime, duration || 1)} step="0.1" onChange={event => seek(Number(event.target.value))} /><span>{formatTime(duration)}</span></div>
      <div className="inline-learning-player__action-row">
        <div className="inline-learning-player__core-actions"><button type="button" onClick={togglePlayback} aria-label={isPlaying ? "一時停止する" : "再生する"}>{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><div className="inline-learning-player__volume"><button type="button" onClick={toggleMute} aria-label={isMuted ? "ミュートを解除する" : "ミュートする"}>{isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button><input aria-label="音量" type="range" min="0" max="1" value={isMuted ? 0 : volume} step="0.05" onChange={event => changeVolume(Number(event.target.value))} /></div><button type="button" className={captionsEnabled ? "is-selected" : ""} onClick={toggleCaptions} aria-pressed={captionsEnabled} aria-label="字幕を切り替える"><Captions size={18} /><span>字幕</span></button><label className="inline-learning-player__rate"><span className="sr-only">再生速度</span><select aria-label="再生速度" value={playbackRate} onChange={event => setRate(event.target.value)}><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><button type="button" onClick={() => void enterFullscreen()} aria-label="全画面表示"><Expand size={18} /></button></div>
        {canSaveProgress && onSaveProgress ? <button className="inline-learning-player__save" type="button" onClick={() => onSaveProgress({ positionSeconds: Math.round(currentTime), progressPercent })} disabled={isSavingProgress}><Save size={16} />{isSavingProgress ? "保存中…" : "現在の位置を保存"}</button> : <p className="inline-learning-player__preview-note">加入すると、再生位置をマイページへ保存できます。</p>}
      </div>
    </div>
  </section>;
}
