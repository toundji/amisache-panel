/**
 * Export des demandes (liste filtrée) en PDF ou Word. Les librairies sont
 * importées dynamiquement : elles ne pèsent sur le bundle qu'au premier export.
 */

export interface RequestExportRow {
  requester: string;
  type: string;
  text: string;
  date: string;
  time: string;
  church: string;
  offering: string;
  status: string;
}

export interface RequestExportMeta {
  title: string;
  /** Résumé des filtres appliqués, affiché sous le titre. */
  subtitle: string;
  fileName: string;
}

const HEADERS = ['#', 'Demandeur', 'Type', 'Intention / texte', 'Date', 'Heure', 'Église', 'Offrande', 'Statut'];

function toCells(r: RequestExportRow, i: number): string[] {
  return [String(i + 1), r.requester, r.type, r.text, r.date, r.time, r.church, r.offering, r.status];
}

function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportRequestsPdf(rows: RequestExportRow[], meta: RequestExportMeta): Promise<void> {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(14);
  doc.text(meta.title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(meta.subtitle, 14, 21);

  autoTable(doc, {
    startY: 26,
    margin: { left: 14, right: 14 },
    head: [HEADERS],
    body: rows.map(toCells),
    // Largeur EXPLICITE sur toutes les colonnes (pas seulement "Intention / texte") :
    // laisser les autres en 'auto' pouvait faire recalculer/rétrécir la largeur du
    // texte par l'algorithme de mise à l'échelle d'autoTable si le total dépassait la
    // page — la colonne texte n'avait alors plus vraiment 80mm, d'où la coupure.
    // Somme des largeurs ci-dessous : 267mm, tient dans les 269mm disponibles
    // (a4 paysage 297mm − 14mm de marge de chaque côté).
    styles: { fontSize: 8, cellPadding: 1.5, valign: 'top', overflow: 'linebreak' },
    headStyles: { fillColor: [60, 60, 60] },
    columnStyles: {
      0: { cellWidth: 8 },   // #
      1: { cellWidth: 32 },  // Demandeur
      2: { cellWidth: 28 },  // Type
      3: { cellWidth: 90 },  // Intention / texte
      4: { cellWidth: 22 },  // Date
      5: { cellWidth: 15 },  // Heure
      6: { cellWidth: 32 },  // Église
      7: { cellWidth: 20 },  // Offrande
      8: { cellWidth: 20 },  // Statut
    },
  });

  doc.save(`${meta.fileName}.pdf`);
}

export async function exportRequestsDocx(rows: RequestExportRow[], meta: RequestExportMeta): Promise<void> {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, PageOrientation, HeadingLevel } =
    await import('docx');

  const cell = (text: string, bold = false) =>
    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text, bold, size: 18 })] })] });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: HEADERS.map((h) => cell(h, true)) }),
      ...rows.map((r, i) => new TableRow({ children: toCells(r, i).map((c) => cell(c)) })),
    ],
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
        children: [
          new Paragraph({ text: meta.title, heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ children: [new TextRun({ text: meta.subtitle, italics: true, size: 18 })] }),
          new Paragraph({ text: '' }),
          table,
        ],
      },
    ],
  });

  download(await Packer.toBlob(doc), `${meta.fileName}.docx`);
}
