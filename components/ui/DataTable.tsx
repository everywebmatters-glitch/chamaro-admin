import type { ReactNode } from "react";

export interface DataTableColumn<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
  // Shown in the heading of each phone card instead of as a labelled field. Defaults to the first column.
  primary?: boolean;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
}

export function DataTable<T>({ columns, data, getRowKey }: DataTableProps<T>) {
  const hasPrimary = columns.some((col) => col.primary);
  const isPrimary = (col: DataTableColumn<T>, index: number) => (hasPrimary ? Boolean(col.primary) : index === 0);
  const primaryColumns = columns.filter(isPrimary);
  // Columns with a text header become label/value fields; the rest (e.g. row actions) form the card's footer.
  const fieldColumns = columns.filter((col, i) => !isPrimary(col, i) && typeof col.header === "string");
  const footerColumns = columns.filter((col, i) => !isPrimary(col, i) && typeof col.header !== "string");

  return (
    <>
      {/* Phones: one card per row, so nothing has to scroll sideways. */}
      <ul className="divide-y divide-zinc-100 md:hidden">
        {data.map((row) => (
          <li key={getRowKey(row)} className="flex flex-col gap-3 px-4 py-4 text-sm">
            <div className="flex min-w-0 flex-wrap items-start gap-x-4 gap-y-2 text-zinc-700">
              {primaryColumns.map((col) => (
                <div key={col.key} className={`min-w-0 flex-1 ${primaryColumns.length > 1 ? "first:flex-none" : ""}`}>
                  {col.render(row)}
                </div>
              ))}
            </div>
            {fieldColumns.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                {fieldColumns.map((col) => (
                  <div key={col.key} className="min-w-0">
                    <dt className="text-xs text-zinc-400">{col.header}</dt>
                    <dd className="mt-0.5 break-words text-zinc-700">{col.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {footerColumns.map((col) => (
              <div key={col.key} className="-mb-1 flex justify-end border-t border-zinc-100 pt-2">
                {col.render(row)}
              </div>
            ))}
          </li>
        ))}
      </ul>

      {/* `relative` keeps absolutely positioned content (sr-only headers) inside the scroll box. */}
      <div className="relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-4 py-3 font-medium text-zinc-500 ${col.headerClassName ?? ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 align-middle text-zinc-700 ${col.className ?? ""}`}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
