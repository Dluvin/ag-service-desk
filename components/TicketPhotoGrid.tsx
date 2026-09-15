export function TicketPhotoGrid({
  photos,
}: {
  photos: { id: string; fileName: string }[];
}) {
  if (photos.length === 0) return null;
  return (
    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) => (
        <li key={photo.id}>
          <a href={`/api/ticket-photos/${photo.id}`} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/ticket-photos/${photo.id}`}
              alt={photo.fileName}
              className="h-36 w-full rounded-lg border border-stone-200 object-cover"
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
