"use client";

import { deleteTicketPhotoAction } from "@/lib/actions";
import { DeleteButton } from "@/components/DeleteButton";
import { useT } from "@/components/I18nProvider";

export function TicketPhotoGrid({
  photos,
  canDelete = false,
}: {
  photos: { id: string; fileName: string }[];
  canDelete?: boolean;
}) {
  const t = useT();
  if (photos.length === 0) return null;
  return (
    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id} className="space-y-2">
          <a href={`/api/ticket-photos/${photo.id}`} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/ticket-photos/${photo.id}`}
              alt={photo.fileName}
              className="h-36 w-full rounded-lg border border-stone-200 object-cover"
            />
          </a>
          <p className="truncate text-xs text-stone-600" title={photo.fileName}>
            {photo.fileName}
          </p>
          {canDelete ? (
            <div className="no-print">
              <DeleteButton
                action={deleteTicketPhotoAction}
                name="photoId"
                value={photo.id}
                label={t("ticket.deletePhoto")}
                confirmText={t("ticket.deletePhotoConfirm", { name: photo.fileName })}
                typedMatch={photo.fileName}
              />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
