export type ExportProgressCallback = (step: number, total: number) => void;

export async function exportToPDF(
  onProgress?: ExportProgressCallback
): Promise<void> {
  const pages = document.querySelectorAll<HTMLElement>('.report-page');
  if (!pages.length) return;

  const { jsPDF } = await import('jspdf');
  const html2canvas = (await import('html2canvas')).default;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const total = pages.length;

  for (let i = 0; i < total; i++) {
    onProgress?.(i + 1, total);

    const canvas = await html2canvas(pages[i], {
      scale: 2,
      backgroundColor: '#0B1929',
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
  }

  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  pdf.save(`WOS_퇴사설문분석_${today}.pdf`);
}
