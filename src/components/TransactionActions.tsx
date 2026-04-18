"use client";

import { useRef, useState } from "react";
import {
  Pencil,
  Copy,
  CheckCircle,
  Clock,
  Paperclip,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import { useKallioStore } from "@/lib/store";
import { useT } from "@/lib/useT";
import { formatCurrency } from "@/lib/tax-engine";
import type { Transaction } from "@/lib/types";

interface TransactionActionsProps {
  tx: Transaction;
  onClose: () => void;
  onEdit: () => void;
}

export function TransactionActions({ tx, onClose, onEdit }: TransactionActionsProps) {
  const t = useT();
  const duplicateTransaction = useKallioStore((s) => s.duplicateTransaction);
  const markReviewed = useKallioStore((s) => s.markReviewed);
  const deleteTransaction = useKallioStore((s) => s.deleteTransaction);
  const updateTransaction = useKallioStore((s) => s.updateTransaction);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDuplicate = () => {
    duplicateTransaction(tx.id);
    onClose();
  };

  const handleMarkReviewed = () => {
    markReviewed(tx.id, !tx.reviewed);
    onClose();
  };

  const handleDelete = () => {
    deleteTransaction(tx.id);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1048576) {
      setAttachmentError(t.actions.fileTooLarge);
      e.target.value = "";
      return;
    }

    setAttachmentError("");
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      updateTransaction(tx.id, {
        attachmentName: file.name,
        attachmentData: dataUrl,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = () => {
    updateTransaction(tx.id, {
      attachmentName: undefined,
      attachmentData: undefined,
    });
  };

  const displayName = tx.merchant ?? tx.description;
  const isIncome = tx.type === "income";

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-t-2xl w-full max-w-md p-6 space-y-2">
        {/* Summary header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-900 text-sm truncate max-w-[200px]">
              {displayName}
            </p>
            <p
              className={`text-base font-bold tabular-nums ${
                isIncome ? "text-emerald-600" : "text-slate-800"
              }`}
            >
              {isIncome ? "+" : "−"}{formatCurrency(tx.amount)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {!showDeleteConfirm ? (
          <>
            {/* Edit */}
            <button
              onClick={onEdit}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left hover:bg-slate-50 transition-colors text-slate-800"
            >
              <Pencil className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {t.actions.edit}
            </button>

            {/* Duplicate */}
            <button
              onClick={handleDuplicate}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left hover:bg-slate-50 transition-colors text-slate-800"
            >
              <Copy className="w-4 h-4 text-slate-500 flex-shrink-0" />
              {t.actions.duplicate}
            </button>

            {/* Mark reviewed / pending */}
            <button
              onClick={handleMarkReviewed}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left hover:bg-slate-50 transition-colors text-slate-800"
            >
              {tx.reviewed ? (
                <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
              ) : (
                <CheckCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
              )}
              {tx.reviewed ? t.actions.markPending : t.actions.markReviewed}
            </button>

            {/* Attachment */}
            <div>
              {tx.attachmentName && tx.attachmentData ? (
                <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-800 bg-slate-50">
                  <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="flex-1 truncate text-slate-700">{tx.attachmentName}</span>
                  <a
                    href={tx.attachmentData}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 hover:text-teal-800 transition-colors flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t.actions.viewAttachment}
                  </a>
                  <button
                    onClick={handleRemoveAttachment}
                    className="text-red-500 hover:text-red-700 transition-colors text-xs"
                  >
                    {t.actions.removeAttachment}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left hover:bg-slate-50 transition-colors text-slate-800"
                >
                  <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  {t.actions.attachment}
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {attachmentError && (
                <p className="text-xs text-red-600 mt-1 px-4">{attachmentError}</p>
              )}
            </div>

            {/* Delete */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-left hover:bg-red-50 transition-colors text-red-600"
            >
              <Trash2 className="w-4 h-4 flex-shrink-0" />
              {t.actions.delete}
            </button>

            {/* Cancel */}
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 mt-2 transition-colors"
            >
              {t.actions.cancel}
            </button>
          </>
        ) : (
          /* Delete confirmation */
          <div className="space-y-4 pt-2">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">
                {t.actions.deleteConfirmTitle}
              </h3>
              <p className="text-sm text-slate-500">{t.actions.deleteConfirmBody}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="py-3 rounded-xl text-sm font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                {t.actions.cancel}
              </button>
              <button
                onClick={handleDelete}
                className="py-3 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {t.actions.delete}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
