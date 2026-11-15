export function PlanLimitNote({ title, why }: { title: string; why: string }) {
  return (
    <p className="text-sm text-stone-500">
      <span className="font-medium text-stone-700">{title}.</span> {why}
    </p>
  );
}
