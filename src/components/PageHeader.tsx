type PageHeaderProps = {
  title: string;
  onBack: () => void;
  backDisabled?: boolean;
};

export default function PageHeader({ title, onBack, backDisabled = false }: PageHeaderProps) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <button
        onClick={onBack}
        disabled={backDisabled}
        className="text-sm text-muted hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="w-14" />
    </header>
  );
}
