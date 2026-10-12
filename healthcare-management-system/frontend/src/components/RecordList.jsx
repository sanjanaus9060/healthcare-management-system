import { Download, Eye, FileText, Pill, Stethoscope, Activity, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatError } from "@/lib/api";
import { downloadFile, openFile } from "@/lib/files";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/common";
import { formatDate } from "@/lib/format";

const TYPE_META = {
  consultation: { label: "Consultation", icon: Stethoscope, tone: "bg-blue-50 text-blue-700" },
  prescription: { label: "Prescription", icon: Pill, tone: "bg-teal-50 text-teal-700" },
  diagnosis: { label: "Diagnosis", icon: Activity, tone: "bg-amber-50 text-amber-700" },
  document: { label: "Document", icon: FileText, tone: "bg-emerald-50 text-emerald-700" },
};

const safely = (fn) => async () => {
  try {
    await fn();
  } catch (err) {
    toast.error(formatError(err));
  }
};

function DocumentChip({ record }) {
  const doc = record.document;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 font-mono text-xs text-slate-600">
        <FileText className="h-3.5 w-3.5" /> {doc.file_name} · {doc.file_type}{doc.size_kb ? ` · ${doc.size_kb} KB` : ""}
      </p>
      {doc.file_id ? (
        <>
          <Button size="sm" variant="outline" data-testid={`record-view-file-${record.id}`} onClick={safely(() => openFile(doc.file_id))} className="h-8 rounded-full"><Eye className="mr-1.5 h-3.5 w-3.5" />View</Button>
          <Button size="sm" variant="outline" data-testid={`record-download-file-${record.id}`} onClick={safely(() => downloadFile(doc.file_id, doc.file_name))} className="h-8 rounded-full"><Download className="mr-1.5 h-3.5 w-3.5" />Download</Button>
        </>
      ) : (
        <span className="text-xs text-slate-400">Details only - no file attached</span>
      )}
    </div>
  );
}

function RecordCard({ record }) {
  const meta = TYPE_META[record.record_type];
  const Icon = meta.icon;
  return (
    <article data-testid={`record-card-${record.id}`} className="card-surface p-5">
      <div className="flex items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-semibold text-slate-900">{record.title}</h3>
            <span className="text-xs text-slate-400">{formatDate(record.created_at)}</span>
          </div>
          <p className="text-xs text-slate-500">
            {meta.label} · added by {record.author_name}{record.author_role === "patient" ? " (patient)" : ""}
          </p>
          {record.diagnosis && <p className="text-sm"><span className="font-semibold text-slate-700">Diagnosis: </span>{record.diagnosis}</p>}
          {record.description && <p className="text-sm leading-relaxed text-slate-600">{record.description}</p>}
          {record.medications?.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/60">
              {record.medications.map((m, i) => (
                <li key={i} className="grid gap-1 px-3 py-2 text-sm sm:grid-cols-4">
                  <span className="font-semibold text-slate-800">{m.name}</span>
                  <span className="text-slate-600">{m.dosage}</span>
                  <span className="text-slate-600">{m.frequency}</span>
                  <span className="text-slate-500">{m.duration}</span>
                </li>
              ))}
            </ul>
          )}
          {record.document && <DocumentChip record={record} />}
        </div>
      </div>
    </article>
  );
}

export default function RecordList({ records }) {
  const tabs = ["all", "consultation", "prescription", "diagnosis", "document"];
  return (
    <Tabs defaultValue="all">
      <TabsList className="h-auto flex-wrap justify-start gap-1 bg-slate-100 p-1">
        {tabs.map((t) => (
          <TabsTrigger key={t} value={t} data-testid={`records-tab-${t}`} className="capitalize">
            {t === "all" ? "All" : `${TYPE_META[t].label}s`}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => {
        const list = t === "all" ? records : records.filter((r) => r.record_type === t);
        return (
          <TabsContent key={t} value={t} className="mt-5 space-y-4">
            {list.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No records here yet" description="Records added by authorized clinicians will appear in this section." />
            ) : (
              list.map((r) => <RecordCard key={r.id} record={r} />)
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

export const ChipList = ({ items, tone = "amber", empty = "None recorded", testId }) => (
  <div data-testid={testId} className="flex flex-wrap gap-2">
    {items?.length ? (
      items.map((i) => (
        <span key={i} className={`rounded-full px-3 py-1 text-xs font-semibold ${tone === "amber" ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200" : "bg-teal-50 text-teal-800 ring-1 ring-teal-200"}`}>{i}</span>
      ))
    ) : (
      <span className="text-sm text-slate-400">{empty}</span>
    )}
  </div>
);
