"use client";

import { useEffect } from "react";
import { parseVideoEmbed } from "@/lib/video-embed";

export default function VideoModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const embed = parseVideoEmbed(url);

  return (
    <div
      className="fixed inset-0 bg-black/85 flex items-center justify-center z-[100] p-5"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-line rounded-2xl w-full max-w-[900px] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="text-[14px] font-semibold text-text truncate m-0">{title}</p>
          <button
            onClick={onClose}
            title="Cerrar"
            autoFocus
            className="flex-none w-9 h-9 rounded-full bg-surface-2 hover:bg-surface-3 text-text flex items-center justify-center border border-line"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          {embed.kind === "youtube" || embed.kind === "vimeo" || embed.kind === "drive" ? (
            <iframe
              src={embed.embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : embed.kind === "file" ? (
            <video src={embed.url} controls autoPlay className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <p className="text-[13px] text-text-dim m-0">
                No pudimos reconocer este link para reproducirlo acá adentro.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-accent hover:bg-accent-dim text-white rounded-lg font-semibold text-[13px] px-4 py-2"
              >
                Abrir en una pestaña nueva
              </a>
            </div>
          )}
        </div>

        {embed.kind !== "unknown" && (
          <div className="flex justify-end mt-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-faint hover:text-text-dim text-[12px]"
            >
              Abrir en una pestaña nueva ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
