export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return '\uFEFF' + rows.map(row => row.map(cell => {
    let value = cell == null ? '' : String(cell);
    if (/^[\s]*[=+@-]/.test(value)) value = "'" + value;
    return '"' + value.replace(/"/g, '""') + '"';
  }).join(',')).join('\r\n');
}
export async function downloadCsv(filename: string, rows: Array<Array<string | number | null | undefined>>): Promise<void> {
  const safeName = (filename.replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').replace(/\.csv$/i, '').slice(0, 120) || 'report') + '.csv';
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const host = window as Window & {
    flutter_inappwebview?: { callHandler(name: string, ...args: unknown[]): Promise<unknown> };
    showSaveFilePicker?: (options: unknown) => Promise<{ createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void>; abort(): Promise<void> }> }>;
  };
  if (typeof host.flutter_inappwebview?.callHandler === 'function') {
    if (blob.size > 10 * 1024 * 1024) throw new Error('This report is too large to export in the app. Use a smaller report.');
    const bytes = new TextEncoder().encode(csv);
    let binary = '';
    for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...Array.from(bytes.slice(start, start + 8192)));
    const result = await host.flutter_inappwebview.callHandler('downloadFile', {
      filename: safeName, mimeType: 'text/csv', encoding: 'base64', data: btoa(binary),
    }) as { success?: boolean; cancelled?: boolean } | null;
    if (result?.cancelled) return;
    if (result?.success !== true) throw new Error('The app could not export the file. The downloadFile handler must be enabled.');
    return;
  }
  // Invoke the picker in the click's user-activation context, before any await.
  if (typeof host.showSaveFilePicker === 'function') {
    try {
      const file = await host.showSaveFilePicker({ suggestedName: safeName, types: [{ description: 'CSV report', accept: { 'text/csv': ['.csv'] } }] });
      const writer = await file.createWritable();
      try { await writer.write(blob); await writer.close(); }
      catch (error) { await writer.abort().catch(() => {}); throw error; }
      return;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      throw error;
    }
  }
  const file = new File([blob], safeName, { type: 'text/csv' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); }
    catch (error) { if (!(error instanceof Error && error.name === 'AbortError')) throw error; }
    return;
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = safeName; link.style.display = 'none';
  document.body.appendChild(link);
  try { link.click(); }
  finally {
    link.remove();
    // Allow slower browsers time to consume the Blob instead of revoking after 1s.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
