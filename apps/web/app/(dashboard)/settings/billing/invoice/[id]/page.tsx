'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Download, Printer, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import InvoicePDF from '@/components/subscriptions/InvoicePDF';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function fetchInvoice() {
      try {
        const { data } = await api.get(`/subscriptions/invoices/${id}`);
        setInvoice(data);
      } catch {
        toast.error('فشل تحميل الفاتورة');
        router.push('/settings/billing');
      } finally {
        setLoading(false);
      }
    }
    fetchInvoice();
  }, [id, router]);

  const handleDownloadPDF = useCallback(async () => {
    if (!invoiceRef.current) return;
    setExporting(true);

    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${invoice.invoiceNumber}.pdf`);

      toast.success('تم تحميل الفاتورة بنجاح');
    } catch {
      toast.error('فشل تصدير الفاتورة');
    } finally {
      setExporting(false);
    }
  }, [invoice]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!invoice) return null;

  return (
    <div className="space-y-6">
      {/* Toolbar (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/settings/billing')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-hover transition-colors"
          >
            <ArrowRight className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">فاتورة {invoice.invoiceNumber}</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">فاتورة ضريبية مبسطة</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            طباعة
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={exporting}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {exporting ? 'جاري التصدير...' : 'تحميل PDF'}
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="glass-card overflow-hidden print:shadow-none print:border-none">
        <InvoicePDF ref={invoiceRef} invoice={invoice} />
      </div>
    </div>
  );
}
