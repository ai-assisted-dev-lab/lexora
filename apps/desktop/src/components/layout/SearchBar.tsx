import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface SearchBarProps {
  onActivate?: () => void;
}

export function SearchBar({ onActivate }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        onActivate?.();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onActivate]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = inputRef.current?.value.trim() ?? "";
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate("/search");
    }
  }

  return (
    <form className="search-bar" role="search" onSubmit={handleSubmit}>
      <Search size={15} className="search-bar__icon" aria-hidden="true" />
      <input
        ref={inputRef}
        className="search-bar__input"
        type="search"
        placeholder="Search words, decks, topics..."
        aria-label="Search words, decks, topics"
        onClick={onActivate}
      />
      <div className="search-bar__kbd" aria-hidden="true">
        <kbd>Ctrl</kbd>
        <kbd>K</kbd>
      </div>
    </form>
  );
}
