"use client";

import { useRef } from "react";
import { Printer, CheckCircle } from "lucide-react";
import { Receipt } from "./receipt";
import { printReceipt } from "@/lib/thermal-print";
import { useTranslations } from "next-intl";

interface ReceiptSettings {
  name: string;
  logoUrl: string | null;
  currency: string;
  currencyDecimals: number;
  taxName: string;
  receiptFooter: string;
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface ReceiptModalProps {
  open: boolean;
  onClose: () => void;
  data: {
    saleId?: string;
    items: ReceiptItem[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    total: number;
    paymentMethod: string;
    amountTendered?: number;
    changeDue?: number;
  };
  settings: ReceiptSettings;
}

export function ReceiptModal({ open, onClose, data, settings }: ReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("pos");

  if (!open) return null;

  function handleBrowserPrint() {
    window.print();
  }

  async function handleThermalPrint() {
    await printReceipt({ data, settings });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      {/* Print styles: when printing, only show receipt */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-print-overlay, #receipt-print-overlay * { visibility: visible; }
          #receipt-print-overlay { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 0; }
        }
      `}</style>

      <div id="receipt-print-overlay" className="w-full max-w-sm rounded-xl bg-white border shadow-2xl overflow-hidden">
        {/* Toolbar */}
        <div className="no-print flex items-center justify-between border-b px-4 py-3 bg-card">
          <h2 className="font-semibold text-sm">Receipt Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleThermalPrint}
              title="Thermal print (Web Serial)"
              className="rounded border px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-accent transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Thermal
            </button>
            <button
              onClick={handleBrowserPrint}
              className="rounded bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
            <button onClick={onClose} className="rounded p-1 hover:bg-accent transition-colors hidden sm:block">
              <CheckCircle className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Receipt preview */}
        <div ref={printRef} className="overflow-y-auto max-h-[70vh] bg-white p-4">
          <Receipt data={data} settings={settings} />
        </div>
        
        {/* Complete Button */}
        <div className="no-print border-t p-3 bg-card">
          <button onClick={onClose} className="w-full rounded-lg bg-primary text-primary-foreground border-transparent py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors">
            {t("transaction_complete")}
          </button>
        </div>
      </div>
    </div>
  );
}
