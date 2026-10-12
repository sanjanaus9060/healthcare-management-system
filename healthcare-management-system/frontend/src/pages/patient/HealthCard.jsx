import { useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Download, Printer, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState, PageHeader, PageLoader } from "@/components/common";
import ConfirmButton from "@/components/ConfirmButton";
import { api, formatError } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { formatDate } from "@/lib/format";
import DoctorAccessPanel from "@/components/DoctorAccessPanel";
import HealthCardForm from "./HealthCardForm";

function CardVisual({ card, qrRef }) {
  const verifyUrl = `${window.location.origin}/card/verify/${card.qr_token}`;
  return (
    <div id="print-card" data-testid="digital-health-card" className="relative w-full max-w-md overflow-hidden rounded-3xl border border-blue-700/50 bg-gradient-to-br from-blue-900 via-blue-800 to-teal-800 p-6 text-white shadow-xl">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-teal-400/20 blur-2xl" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-teal-200">CareBridge Integrated Health Card</p>
          <p data-testid="health-card-name" className="mt-3 font-heading text-2xl font-bold tracking-tight">{card.name}</p>
          <p data-testid="health-card-patient-id" className="mt-1 font-mono text-sm tracking-widest text-teal-100">{card.patient_id}</p>
        </div>
        <span data-testid="health-card-blood-group" className="rounded-full border border-red-300/40 bg-red-500/25 px-3 py-1 text-sm font-bold text-red-50">
          {card.blood_group || "—"}
        </span>
      </div>
      <div className="relative mt-6 grid grid-cols-[1fr_auto] gap-4">
        <dl className="space-y-2.5 text-xs">
          <div><dt className="text-blue-200">Date of birth</dt><dd className="font-semibold">{formatDate(card.date_of_birth)}</dd></div>
          <div><dt className="text-blue-200">Phone</dt><dd className="font-semibold">{card.phone || "—"}</dd></div>
          <div><dt className="text-blue-200">Emergency contact</dt>
            <dd className="font-semibold">{card.emergency_contact ? `${card.emergency_contact.name} (${card.emergency_contact.relation}) · ${card.emergency_contact.phone}` : "—"}</dd></div>
          <div><dt className="text-blue-200">Allergies</dt><dd data-testid="health-card-allergies" className="font-semibold">{card.allergies.join(", ") || "None recorded"}</dd></div>
          <div><dt className="text-blue-200">Conditions</dt><dd className="font-semibold">{card.chronic_conditions.join(", ") || "None recorded"}</dd></div>
        </dl>
        <div ref={qrRef} data-testid="health-card-qr-code" className="self-end rounded-xl bg-white p-2.5 shadow-md">
          <QRCodeCanvas value={verifyUrl} size={104} level="M" />
        </div>
      </div>
      <p className="relative mt-5 text-[10px] text-blue-200">QR contains only a revocable verification link - no medical data.</p>
    </div>
  );
}

export default function HealthCard() {
  const { data: card, loading, error, reload, setData } = useFetch("/health-card/me");
  const qrRef = useRef(null);

  const downloadQr = () => {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `health-card-qr-${card.patient_id}.png`;
    a.click();
    toast.success("QR code downloaded");
  };

  const regenerate = async () => {
    try {
      setData((await api.post("/health-card/me/regenerate-qr")).data);
      toast.success("New QR code issued. The previous one no longer works.");
    } catch (err) {
      toast.error(formatError(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader eyebrow="Digital health card" title="Your integrated health card" subtitle="Show this card at any partner clinic. Print it or save it as a PDF from the print dialog." />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,440px)_1fr]">
        <div className="space-y-4">
          <CardVisual card={card} qrRef={qrRef} />
          <div className="flex flex-wrap gap-2">
            <Button data-testid="health-card-print-button" onClick={() => window.print()} className="rounded-full bg-blue-800 hover:bg-blue-700"><Printer className="mr-2 h-4 w-4" />Print / Save PDF</Button>
            <Button data-testid="health-card-download-qr-button" variant="outline" onClick={downloadQr} className="rounded-full"><Download className="mr-2 h-4 w-4" />Download QR</Button>
            <ConfirmButton testId="health-card-regenerate-qr-button" label={<><RefreshCcw className="mr-2 h-4 w-4" />Revoke & reissue QR</>}
              title="Reissue your QR code?" description="The current QR code will stop working immediately. Reprint your card afterwards."
              confirmLabel="Reissue" onConfirm={regenerate} className="rounded-full" />
          </div>
        </div>
        <HealthCardForm card={card} onSaved={setData} />
      </div>
      <DoctorAccessPanel />
    </>
  );
}
