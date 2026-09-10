export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return '\uFEFF' + rows.map(row => row.map(cell => {
    let value = cell == null ? '' : String(cell);
    if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
export function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
