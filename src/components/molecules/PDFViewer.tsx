import { PDFViewer } from '@embedpdf/react-pdf-viewer';

interface PdfAttachmentViewerProps {
  pdfUrl: string;
}

export function PdfAttachmentViewer({ pdfUrl }: PdfAttachmentViewerProps) {
  return (
    <PDFViewer
      config={{ src: pdfUrl }}
      style={{ width: '100%', height: '80vh' }}
    />
  );
}
