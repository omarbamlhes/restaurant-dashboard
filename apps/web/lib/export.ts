// Shared client-side export helpers (CSV + PDF).
// Kept framework-agnostic so any dashboard page can reuse the same
// Arabic-safe CSV encoding and A4 PDF snapshot logic.

export type CsvCell = string | number | null | undefined;

/**
 * Download a table as a CSV that Excel opens with correct Arabic:
 * UTF-8 BOM prefix + every cell quoted/escaped. Returns false (and does
 * nothing) when there are no rows, so callers can show a toast.
 */
export function downloadCSV(
  filename: string,
  headers: string[],
  rows: CsvCell[][],
): boolean {
  if (!rows.length) return false;

  const escape = (v: CsvCell) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows]
    .map((row) => row.map(escape).join(','))
    .join('\r\n');

  // Leading BOM (﻿) makes Excel detect UTF-8 and render Arabic correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Snapshot a DOM element into a multi-page A4 PDF. html2canvas + jspdf are
 * dynamically imported so they stay out of the initial bundle.
 */
export async function exportElementToPDF(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgWidth = 210; // A4 width (mm)
  const pageHeight = 297; // A4 height (mm)
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pdf = new jsPDF('p', 'mm', 'a4');

  let heightLeft = imgHeight;
  let position = 0;
  const imgData = canvas.toDataURL('image/png');

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/** Local date as YYYY-MM-DD for filenames. */
export function fileDateStamp(d: Date = new Date()): string {
  return d.toISOString().split('T')[0];
}
