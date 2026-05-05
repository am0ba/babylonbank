export default function Loading() {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-yellow-400"></div>
        <p className="text-sm font-medium animate-pulse text-muted-foreground uppercase tracking-widest">Загрузка данных...</p>
      </div>
    </div>
  );
}
