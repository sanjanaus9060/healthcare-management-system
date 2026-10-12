import { ErrorState, PageHeader, PageLoader } from "@/components/common";
import RecordList, { ChipList } from "@/components/RecordList";
import UploadDocumentDialog from "@/components/UploadDocumentDialog";
import { useFetch } from "@/lib/useFetch";

export default function MedicalRecords() {
  const { data, loading, error, reload } = useFetch("/records/me");
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader eyebrow="Medical records" title="Your health history" subtitle="Consultations, prescriptions and diagnoses are entered only by your authorized doctors."
        action={<UploadDocumentDialog onAdded={reload} />} />
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card-surface space-y-3 p-6"><h2 className="font-heading font-semibold text-slate-900">Allergies</h2><ChipList items={data.allergies} testId="records-allergies" /></div>
        <div className="card-surface space-y-3 p-6"><h2 className="font-heading font-semibold text-slate-900">Medical conditions</h2><ChipList items={data.chronic_conditions} tone="teal" testId="records-conditions" /></div>
      </div>
      <RecordList records={data.records} />
    </>
  );
}
