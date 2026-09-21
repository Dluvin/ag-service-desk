"use client";

import { deletePivotDocumentAction, uploadPivotDocumentsAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";

export type PivotDocumentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
  uploadedBy?: string;
};

export function PivotDocuments({
  pivotId,
  documents,
  canManage,
  returnTo,
  compact = false,
}: {
  pivotId: string;
  documents: PivotDocumentItem[];
  canManage: boolean;
  returnTo?: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "mt-2" : "mt-3"}>
      {documents.length === 0 ? (
        <p className="text-sm text-stone-600">No documents on this pivot yet.</p>
      ) : (
        <ul className="divide-y divide-stone-100 overflow-hidden rounded-xl border border-stone-200 bg-white">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <a
                  href={`/api/pivot-documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-emerald-800 hover:underline"
                >
                  {document.fileName}
                </a>
                {document.uploadedBy ? (
                  <p className="text-xs text-stone-500">
                    {document.uploadedBy} · {new Date(document.createdAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
              {canManage ? (
                <form
                  action={async (formData) => {
                    await deletePivotDocumentAction(formData);
                  }}
                  onSubmit={(event) => {
                    if (!window.confirm(`Delete ${document.fileName}?`)) event.preventDefault();
                  }}
                >
                  <input type="hidden" name="documentId" value={document.id} />
                  {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
                  <button
                    type="submit"
                    className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-800 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canManage ? (
        <ActionForm
          action={uploadPivotDocumentsAction}
          encType="multipart/form-data"
          className={compact ? "mt-2 space-y-2" : "mt-3 space-y-3 rounded-xl border border-stone-200 bg-white p-4"}
        >
          <input type="hidden" name="pivotId" value={pivotId} />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          <label className="block text-sm font-medium">
            {compact ? "Add files" : "Upload documents"}
            <input
              name="documents"
              type="file"
              multiple
              accept=".pdf,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
              className="mt-1 w-full text-sm"
            />
            {compact ? null : (
              <span className="mt-1 block text-xs font-normal text-stone-500">
                PDF, photos, or Word/Excel/PowerPoint. Up to 10 files, 8 MB each.
              </span>
            )}
          </label>
          <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
            Upload
          </button>
        </ActionForm>
      ) : null}
    </div>
  );
}
