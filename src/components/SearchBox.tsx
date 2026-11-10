import { useState, type FormEvent } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder = 'Search channels, countries, categories…',
  autoFocus = false,
  className,
  inputClassName,
  id,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
  id?: string;
}) {
  const [focused, setFocused] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit?.(value.trim());
  }

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={cn(
        'flex items-center gap-2 rounded-full border bg-ink-900/80 px-3 py-2 transition',
        focused ? 'border-accent-soft/60 ring-2 ring-accent/20' : 'border-white/10',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="Search channels"
        className={cn(
          'min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500',
          inputClassName,
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </form>
  );
}
