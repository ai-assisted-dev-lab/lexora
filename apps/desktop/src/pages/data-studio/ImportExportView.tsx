import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Download,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";

import type {
  ExportableDeckDto,
  ImportExportSchemaDto,
} from "@/services/commands/importExport";
import {
  exportDeckToJson,
  getImportExportSchema,
  importDeckFromJson,
  listExportableDecks,
} from "@/services/commands/importExport";
import { formatTauriError } from "@/services/tauri";
import { useAuth } from "@/store/authContext";

export function ImportExportView() {
  const { user } = useAuth();
  const [schema, setSchema] = useState<ImportExportSchemaDto | null>(null);
  const [decks, setDecks] = useState<ExportableDeckDto[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [exportPath, setExportPath] = useState("");
  const [overwriteExport, setOverwriteExport] = useState(false);
  const [importPath, setImportPath] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getImportExportSchema(), listExportableDecks()])
      .then(([schemaResult, deckResult]) => {
        if (cancelled) return;
        setSchema(schemaResult);
        setDecks(deckResult.decks);
        setSelectedDeckId((current) =>
          current ? current : (deckResult.decks[0]?.id.toString() ?? ""),
        );
      })
      .catch((err) => {
        if (!cancelled) setError(formatTauriError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (user?.role === "learner") {
    return (
      <div className="ds-panel__inner">
        <div className="ds-error" role="alert">
          Owner access is required for bulk import &amp; export operations.
        </div>
      </div>
    );
  }

  async function refreshDecks() {
    try {
      const deckResult = await listExportableDecks();
      setDecks(deckResult.decks);
    } catch (err) {
      setError(formatTauriError(err));
    }
  }

  async function handleExport() {
    const deckId = Number(selectedDeckId);
    if (!Number.isInteger(deckId) || deckId <= 0) {
      setError("Pick a deck to export.");
      return;
    }
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await exportDeckToJson(
        deckId,
        exportPath.trim() ? exportPath.trim() : null,
        overwriteExport,
      );
      setMessage(`Exported ${result.wordCount} words to ${result.filePath}.`);
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  async function handleImport() {
    if (!importPath.trim()) {
      setError("Provide a .json file path to import.");
      return;
    }
    setIsBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await importDeckFromJson(importPath.trim());
      setMessage(
        `Imported ${result.wordsImported} words into ${result.deckSlug}.`,
      );
      await refreshDecks();
    } catch (err) {
      setError(formatTauriError(err));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="ds-panel__inner">
      <div className="ds-validation-header">
        <div>
          <h3>Import &amp; Export</h3>
          <p>
            Bulk move vocabulary decks between Lexora installations using the
            owner-only JSON schema. Imports never overwrite existing slugs.
          </p>
        </div>
        <div className="ds-validation-header__meta">
          <ArrowLeftRight size={16} aria-hidden="true" />
          <span>Owner-only bulk pipelines</span>
        </div>
      </div>

      {message && (
        <div className="ds-feedback ds-feedback--success" role="status">
          <CheckCircle2 size={14} aria-hidden="true" />
          {message}
        </div>
      )}
      {error && (
        <div className="ds-error" role="alert">
          <AlertCircle size={14} aria-hidden="true" />
          {error}
        </div>
      )}

      <section className="ds-import-export-grid">
        <div className="ds-import-export-card">
          <h4>
            <Download size={16} aria-hidden="true" />
            Export deck
          </h4>
          <p className="ds-muted">
            Writes a deterministic JSON archive with all vocabulary, sense, and
            example data for one deck. Use this to seed another Lexora install
            or back up a deck before bulk edits.
          </p>
          <label className="ds-field" htmlFor="ie-deck">
            <span className="ds-field__label">Deck to export</span>
            <select
              id="ie-deck"
              className="ds-select ds-select--wide"
              value={selectedDeckId}
              onChange={(event) => setSelectedDeckId(event.target.value)}
              disabled={decks.length === 0 || isBusy}
            >
              {decks.length === 0 ? (
                <option value="">No local decks</option>
              ) : (
                decks.map((deck) => (
                  <option key={deck.id} value={deck.id}>
                    {deck.title} ({deck.wordCount})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="ds-field" htmlFor="ie-export-path">
            <span className="ds-field__label">Export path</span>
            <input
              id="ie-export-path"
              className="ds-input"
              type="text"
              value={exportPath}
              onChange={(event) => setExportPath(event.target.value)}
              placeholder="Use default export folder"
              disabled={isBusy}
            />
          </label>

          <label className="ds-field" htmlFor="ie-overwrite">
            <input
              id="ie-overwrite"
              type="checkbox"
              checked={overwriteExport}
              onChange={(event) => setOverwriteExport(event.target.checked)}
              disabled={isBusy}
            />
            <span className="ds-field__label">
              Overwrite existing file at this path
            </span>
          </label>

          <button
            type="button"
            className="ds-quality-btn ds-quality-btn--primary"
            onClick={handleExport}
            disabled={isBusy || !selectedDeckId}
          >
            {isBusy ? (
              <Loader2 size={14} className="ds-spin" aria-hidden="true" />
            ) : (
              <Download size={14} aria-hidden="true" />
            )}
            Export to JSON
          </button>
        </div>

        <div className="ds-import-export-card">
          <h4>
            <Upload size={16} aria-hidden="true" />
            Import deck
          </h4>
          <p className="ds-muted">
            Validate and import a Lexora deck JSON. Slugs that already exist are
            rejected so an import cannot silently overwrite local content.
          </p>
          <label className="ds-field" htmlFor="ie-import-path">
            <span className="ds-field__label">Import path</span>
            <input
              id="ie-import-path"
              className="ds-input"
              type="text"
              value={importPath}
              onChange={(event) => setImportPath(event.target.value)}
              placeholder="C:\path\deck.lexora-deck.json"
              disabled={isBusy}
            />
          </label>

          <button
            type="button"
            className="ds-quality-btn ds-quality-btn--primary"
            onClick={handleImport}
            disabled={isBusy || !importPath.trim()}
          >
            {isBusy ? (
              <Loader2 size={14} className="ds-spin" aria-hidden="true" />
            ) : (
              <Upload size={14} aria-hidden="true" />
            )}
            Import JSON
          </button>
        </div>
      </section>

      {schema && (
        <section className="ds-import-export-schema">
          <h4>Schema reference</h4>
          <dl className="ds-import-export-schema__list">
            <div>
              <dt>JSON schema</dt>
              <dd>
                {schema.jsonSchemaName} v{schema.jsonSchemaVersion}
              </dd>
            </div>
            <div>
              <dt>Required top-level fields</dt>
              <dd>{schema.jsonRequiredTopLevelFields.join(", ")}</dd>
            </div>
            <div>
              <dt>CSV headers</dt>
              <dd>{schema.csvHeaders.join(", ")}</dd>
            </div>
            <div>
              <dt>Notes</dt>
              <dd>{schema.csvNotes.join(" ")}</dd>
            </div>
          </dl>
        </section>
      )}
    </div>
  );
}
