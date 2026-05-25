export default function AiErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <div className="max-w-full overflow-hidden break-words [overflow-wrap:anywhere] p-3 border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-200">
      {message}
    </div>
  );
}
