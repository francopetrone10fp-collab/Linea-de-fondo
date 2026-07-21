"use client";

import { useState, useTransition } from "react";
import { addComment, editComment, deleteComment } from "@/app/(app)/partidos/actions";
import { ROLE_LABELS } from "@/lib/constants";
import type { CommentFull } from "@/app/(app)/partidos/queries";

export default function CommentsThread({
  entityType,
  entityId,
  comments,
  canManage,
}: {
  entityType: "partido" | "clip";
  entityId: string;
  comments: CommentFull[];
  canManage: boolean;
}) {
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isPending, startTransition] = useTransition();

  function onSend() {
    if (!text.trim()) return;
    startTransition(async () => {
      await addComment(entityType, entityId, text);
      setText("");
    });
  }

  function onSaveEdit(id: string) {
    startTransition(async () => {
      await editComment(id, editText);
      setEditingId(null);
    });
  }

  function onDelete(id: string) {
    if (!confirm("¿Eliminar este comentario?")) return;
    startTransition(async () => {
      await deleteComment(id);
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2 mb-2.5 max-h-[220px] overflow-y-auto">
        {comments.length === 0 && (
          <p className="text-[12.5px] text-text-faint">Sin comentarios todavía.</p>
        )}
        {comments.map((cm) => (
          <div key={cm.id} className="bg-surface-2 rounded-lg px-2.5 py-2">
            <div className="flex justify-between text-[11px] text-text-faint mb-0.5 gap-2">
              <span>
                <b className="text-text-dim font-semibold">{cm.authorName}</b> · {ROLE_LABELS[cm.authorRole as keyof typeof ROLE_LABELS] ?? cm.authorRole}
              </span>
              <span>
                {new Date(cm.createdAt).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                {cm.editedAt && <span className="italic text-text-faint"> (editado)</span>}
              </span>
            </div>
            {editingId === cm.id ? (
              <>
                <div className="flex gap-1.5 mt-1.5">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="flex-1 h-9 resize-none"
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    onClick={() => onSaveEdit(cm.id)}
                    className="text-text-faint hover:text-text-dim text-[11px] font-semibold"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-text-faint hover:text-text-dim text-[11px] font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-[13px] leading-snug m-0">{cm.text}</p>
                {canManage && (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => {
                        setEditingId(cm.id);
                        setEditText(cm.text);
                      }}
                      className="text-text-faint hover:text-text-dim text-[11px] font-semibold"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onDelete(cm.id)}
                      className="text-text-faint hover:text-bad-text text-[11px] font-semibold"
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Comentario..."
          className="flex-1 h-[38px] resize-none"
        />
        <button
          disabled={isPending}
          onClick={onSend}
          className="bg-accent hover:bg-accent-dim disabled:opacity-50 text-white rounded-lg font-semibold text-[13.5px] px-4 py-2.5 whitespace-nowrap"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}
