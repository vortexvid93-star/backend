import path from 'node:path';
import pdfMake from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));

// Import nommé cassé à l'exécution : `pdfmake` exporte une instance de classe
// singleton (module.exports = new pdfmake()) et non des fonctions libres —
// déstructurer `{ setFonts, createPdf }` perd le `this` interne. On appelle
// donc les méthodes directement sur l'objet importé par défaut.
pdfMake.setFonts({
  Roboto: {
    normal: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Regular.ttf'),
    bold: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Medium.ttf'),
    italics: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-Italic.ttf'),
    bolditalics: path.join(pdfmakeDir, 'fonts/Roboto/Roboto-MediumItalic.ttf'),
  },
});
// Autorise l'accès local aux polices Roboto embarquées (chemins fixes ci-dessus,
// pas d'entrée utilisateur) ; évite l'avertissement "no local access policy".
pdfMake.setLocalAccessPolicy(() => true);

export async function buildPdfBuffer(
  docDefinition: TDocumentDefinitions,
): Promise<Buffer> {
  const merged: TDocumentDefinitions = {
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    pageMargins: [40, 60, 40, 60],
    footer: (currentPage: number, pageCount: number) => ({
      text: `Page ${currentPage} / ${pageCount}`,
      alignment: 'center',
      fontSize: 8,
      margin: [0, 10, 0, 0],
    }),
    ...docDefinition,
  };

  const pdf = pdfMake.createPdf(merged);
  return pdf.getBuffer();
}
