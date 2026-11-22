import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  loadResidents,
  persistResident,
} from "../features/profiling/residentApi";
import { catalog, type RecordRow } from "./catalog";
import {
  prototypeResidents,
  prototypeHouseholds,
  prototypeUnits,
} from "../features/profiling/fixtures";

type Change = { id: string; time: string; description: string };
type Store = {
  records: Record<string, RecordRow[]>;
  history: Change[];
  save: (module: string, row: RecordRow) => void;
  reset: () => void;
  saveResident?: typeof persistResident;
  residentLoadError: string;
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
export function DemoProvider({
  children,
  profilingFixtures = false,
  persistResidents = false,
}: {
  children: ReactNode;
  profilingFixtures?: boolean;
  persistResidents?: boolean;
}) {
  const seeded = () =>
    profilingFixtures
      ? {
          ...initial(),
          residents: prototypeResidents.map((row) => ({ ...row })),
          households: prototypeHouseholds.map((row) => ({ ...row })),
          housing: prototypeUnits.map((row) => ({ ...row })),
        }
      : initial();
  const [records, setRecords] = useState(seeded);
  const [history, setHistory] = useState<Change[]>([]);
  const [residentLoadError, setResidentLoadError] = useState("");
  useEffect(() => {
    if (!persistResidents) return;
    const controller = new AbortController();
    loadResidents(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted)
          setRecords((current) => ({
            ...current,
            residents: [
              ...current.residents,
              ...rows.filter(
                (row) => !current.residents.some((item) => item.id === row.id),
              ),
            ],
          }));
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setResidentLoadError(
            "Database residents could not be loaded. Reload to retry. Session-only samples are excluded from this directory.",
          );
      });
    return () => controller.abort();
  }, [persistResidents]);
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
        saveResident: persistResidents ? persistResident : undefined,
        residentLoadError,
        reset: () => {
          setRecords((current) => ({
            ...seeded(),
            residents: persistResidents
              ? [
                  ...seeded().residents,
                  ...current.residents.filter(
                    (row) => row._storage === "database",
                  ),
                ]
              : seeded().residents,
          }));
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
