import type { AdsChatAnswer } from '@/lib/types/ads-chat';

/** Same data on both layouts: readable label/value cards on phones and narrow chat panels. */
export function ChatDataTable({ table }: { table: AdsChatAnswer['tables'][number] }) {
  return <section className="meta-chat-data" aria-label={table.title}>
    <h3>{table.title}</h3>
    <div className="meta-chat-data-cards">
      {table.rows.map((row, index) => <dl key={index} className="meta-chat-data-row">
        {table.columns.map((column, cell) => <div key={cell}><dt>{column}</dt><dd>{row.cells[cell] ?? '—'}</dd></div>)}
      </dl>)}
      {!table.rows.length && <p className="meta-chat-data-empty">No rows available.</p>}
    </div>
    <div className="meta-chat-data-table" role="region" aria-label={`${table.title} table`} tabIndex={0}>
      <table><caption className="sr-only">{table.title}</caption><thead><tr>{table.columns.map((column, index) => <th scope="col" key={index}>{column}</th>)}</tr></thead>
        <tbody>{table.rows.map((row, index) => <tr key={index}>{table.columns.map((_, cell) => <td key={cell}>{row.cells[cell] ?? '—'}</td>)}</tr>)}</tbody>
      </table>
      {!table.rows.length && <p className="meta-chat-data-empty">No rows available.</p>}
    </div>
  </section>;
}
