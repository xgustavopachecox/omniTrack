'use client';

import React, { useState } from 'react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { Mic, Send, Square, X, Loader2, Sparkles } from 'lucide-react';

interface VoiceTextInputProps {
  placeholder?: string;
  onSendText: (text: string) => Promise<void>;
  onSendAudio: (blob: Blob) => Promise<void>;
  isLoading?: boolean;
}

export function VoiceTextInput({
  placeholder = 'Descreva por texto ou grave um áudio...',
  onSendText,
  onSendAudio,
  isLoading = false,
}: VoiceTextInputProps) {
  const [text, setText] = useState('');
  const {
    isRecording,
    recordingTime,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    clearAudio,
  } = useAudioRecorder();

  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isLoading) return;
    const currentText = text;
    setText('');
    await onSendText(currentText);
  };

  const handleConfirmAudio = async () => {
    if (isRecording) {
      stopRecording();
    }
    if (audioBlob) {
      await onSendAudio(audioBlob);
      clearAudio();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="w-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl">
      {error && (
        <div className="mb-2 text-xs text-red-400 bg-red-950/40 border border-red-800/40 rounded-lg p-2 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearAudio} className="text-red-300 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Recording State UI */}
      {isRecording ? (
        <div className="flex items-center justify-between gap-3 bg-red-950/20 border border-red-500/30 rounded-xl px-4 py-3 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-sm font-semibold text-red-400">
              Gravando áudio: {formatTime(recordingTime)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
              title="Cancelar gravação"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={async () => {
                stopRecording();
                // Wait briefly for blob to set
                setTimeout(async () => {
                  if (audioBlob) {
                    await onSendAudio(audioBlob);
                    clearAudio();
                  }
                }, 200);
              }}
              className="px-3.5 py-1.5 rounded-lg bg-red-600 text-white font-medium text-xs flex items-center gap-1.5 hover:bg-red-500 transition shadow-lg shadow-red-600/30"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
              Finalizar & Enviar
            </button>
          </div>
        </div>
      ) : audioBlob ? (
        /* Audio Preview / Ready to Send State */
        <div className="flex items-center justify-between gap-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Áudio gravado pronto para extração com Gemini 2.5 Flash</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={clearAudio}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={handleConfirmAudio}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:opacity-90 transition shadow-lg shadow-cyan-500/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" />
                  Processar Áudio
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Standard Text + Microphone Form */
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 bg-slate-950/60 text-slate-100 placeholder-slate-500 text-sm rounded-xl px-4 py-3 border border-slate-800 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/60 transition"
          />

          <button
            type="button"
            onClick={startRecording}
            disabled={isLoading}
            className="p-3 rounded-xl bg-slate-800/80 text-cyan-400 hover:text-cyan-300 hover:bg-slate-700/80 border border-cyan-500/20 transition flex items-center justify-center shadow-md"
            title="Gravar mensagem por voz"
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            type="submit"
            disabled={!text.trim() || isLoading}
            className="p-3 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 text-slate-950 font-bold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shadow-lg shadow-cyan-500/20"
            title="Enviar texto"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate-950" />
            ) : (
              <Send className="h-5 w-5 text-slate-950" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
