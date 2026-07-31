import ExcelJS from 'exceljs';

export type SheetSpec = {
  name: string;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, unknown>[];
};

export async function buildWorkbookBuffer(sheets: SheetSpec[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'B LINKS';
  workbook.created = new Date();

  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name);
    sheet.columns = spec.columns.map((c) => ({
      header: c.header,
      key: c.key,
      width: c.width ?? 20,
    }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3949C7' },
    };
    for (const row of spec.rows) {
      sheet.addRow(row);
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
