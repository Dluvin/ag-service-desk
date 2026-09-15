export function TicketPhotoFields({ label }: { label?: string }) {
  return (
    <label className="block text-sm font-medium">
      {label ?? "Photos"}
      <input
        name="photos"
        type="file"
        accept="image/*"
        multiple
        className="mt-1 w-full text-sm"
      />
      <span className="mt-1 block text-xs font-normal text-stone-500">
        Up to 6 photos, 8 MB each. Phone photos work.
      </span>
    </label>
  );
}
