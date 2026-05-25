type PageHeaderProps = {
  title: string;
  onBack: () => void;
};

export default function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <header className="border-b px-4 sm:px-6 py-4 flex items-center justify-between">
      <button
        onClick={onBack}
        className="text-sm text-muted hover:text-foreground"
      >
        &larr; Back
      </button>
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="w-14" />
    </header>
  );
}
