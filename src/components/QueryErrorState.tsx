import Link from "next/link";

type QueryErrorStateProps = {
  title: string;
  message: string;
  href?: string;
  label?: string;
};

export default function QueryErrorState({
  title,
  message,
  href = "/",
  label = "Back home",
}: QueryErrorStateProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-sm text-center space-y-4">
        <div>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{message}</p>
        </div>
        <Link
          href={href}
          className="inline-flex px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover text-sm font-medium transition-colors"
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
