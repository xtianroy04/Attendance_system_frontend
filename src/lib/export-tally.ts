import type { SeminarTally } from '@/lib/api';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function downloadTally(tally: SeminarTally, format: 'xlsx' | 'pdf') {
  const safe = tally.seminar.title.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'seminar';
  const base = `${safe}_tally_${tally.seminar.start_date}_${tally.seminar.end_date}`;

  if (format === 'xlsx') {
    const XLSX = await import('xlsx');
    const header = ['#', 'Name', 'Adventist', ...tally.dates, 'Present', 'Perfect'];
    const rows = tally.rows.map((row, i) => [
      i + 1,
      row.full_name,
      row.is_adventist ? 'Yes' : 'No',
      ...tally.dates.map((d) => row.days[d] || '-'),
      `${row.present_count}/${row.elapsed_days}`,
      row.perfect_attendance ? 'Yes' : 'No',
    ]);
    const aoa = [
      header,
      ...rows,
      [],
      ['Totals'],
      ['Seminarians', tally.total_seminarians],
      ['Perfect attendance', tally.perfect_count],
      ['Seminar', tally.seminar.title],
      ['Dates', `${tally.seminar.start_date} to ${tally.seminar.end_date}`],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Tally');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadBlob(
      new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${base}.xlsx`
    );
    return;
  }

  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Manticao Central Church (SDA)', 40, 36);
  doc.setFontSize(12);
  doc.text(`Attendance Tally — ${tally.seminar.title}`, 40, 56);
  doc.setFontSize(10);
  doc.text(
    `${tally.seminar.start_date} to ${tally.seminar.end_date}  ·  ${tally.total_seminarians} seminarians  ·  ${tally.perfect_count} perfect`,
    40,
    74
  );
  autoTable(doc, {
    startY: 88,
    head: [['#', 'Name', ...tally.dates.map((d) => d.slice(5)), 'P', 'OK']],
    body: tally.rows.map((row, i) => [
      String(i + 1),
      row.full_name,
      ...tally.dates.map((d) => row.days[d] || '-'),
      String(row.present_count),
      row.perfect_attendance ? 'Y' : '',
    ]),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [27, 94, 32] },
  });
  doc.save(`${base}.pdf`);
}
