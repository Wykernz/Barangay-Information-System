import { createContext, useContext, useState, type ReactNode } from "react";
import { catalog, type RecordRow } from "./catalog";

type Change = { id: string; time: string; description: string };
type Store = {
  records: Record<string, RecordRow[]>;
  history: Change[];
  save: (module: string, row: RecordRow) => void;
  reset: () => void;
};
const Context = createContext<Store | null>(null);
const initial = () =>
  Object.fromEntries(
    Object.entries(catalog).map(([key, module]) => [
      key,
      module.rows.map((row) => ({ ...row })),
    ]),
  );

/** Session-memory demo state: never persists sensitive form input in browser storage. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [records, setRecords] = useState(initial);
  const [history, setHistory] = useState<Change[]>([]);
  function save(module: string, row: RecordRow) {
    setRecords((current) => ({
      ...current,
      [module]: current[module].some((item) => item.id === row.id)
        ? current[module].map((item) => (item.id === row.id ? row : item))
        : [...current[module], row],
    }));
    setHistory((current) => [
      {
        id: crypto.randomUUID(),
        time: new Date().toISOString(),
        description: `Saved ${catalog[module].singular} ${row.id}`,
      },
      ...current,
    ]);
  }
  return (
    <Context.Provider
      value={{
        records,
        history,
        save,
        reset: () => {
          setRecords(initial());
          setHistory([]);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const context = useContext(Context);
  if (!context) throw new Error("DemoProvider is required");
  return context;
}
