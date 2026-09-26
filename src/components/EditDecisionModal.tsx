import React, { useState } from 'react';
import { Edit3, Check } from 'lucide-react';
import { DecisionRecord } from '../types';
import { Modal } from './Modal';

interface EditDecisionModalProps {
  decision: DecisionRecord;
  onClose: () => void;
  onSave: (id: string, title: string, problem: string, why?: string) => void;
}

export const EditDecisionModal: React.FC<EditDecisionModalProps> = ({
  decision,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState(decision.title);
  const [problem, setProblem] = useState(decision.problem);
  const [why, setWhy] = useState(decision.why || '');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !problem.trim()) {
      setError('عنوان و صورت مسئله نمی‌توانند خالی باشند');
      return;
    }
    onSave(decision.id, title.trim(), problem.trim(), why.trim());
    onClose();
  };

  const footer = (
    <>
      <button
        type="button"
        onClick={onClose}
        className="rounded-xl border border-line px-4 py-2 text-xs font-bold text-ink-2 hover:bg-surface"
      >
        انصراف
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-surface hover:bg-primary-hover shadow-sm"
      >
        <Check className="h-4 w-4" />
        <span>ذخیره تغییرات</span>
      </button>
    </>
  );

  return (
    <Modal
      onClose={onClose}
      title="ویرایش عنوان و مسئله تصمیم"
      icon={<Edit3 className="h-5 w-5 text-primary" />}
      footer={footer}
      maxWidth="max-w-lg"
      ariaLabelledBy="editDecisionModalTitle"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-right">
        <div>
          <label
            htmlFor="editDecisionTitle"
            className="block text-xs font-bold text-ink mb-1.5"
          >
            عنوان خلاصه تصمیم (الزامی)
          </label>
          <input
            id="editDecisionTitle"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder="عنوان تصمیم"
            className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>

        <div>
          <label
            htmlFor="editDecisionProblem"
            className="block text-xs font-bold text-ink mb-1.5"
          >
            صورت مسئله در یک جمله صریح (الزامی)
          </label>
          <textarea
            id="editDecisionProblem"
            required
            rows={3}
            maxLength={500}
            value={problem}
            onChange={(e) => {
              setProblem(e.target.value);
              if (error) setError(null);
            }}
            placeholder="صورت مسئله..."
            className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>

        <div>
          <label
            htmlFor="editDecisionWhy"
            className="block text-xs font-bold text-ink mb-1.5"
          >
            چرا این تصمیم مهم است؟ <span className="text-ink-3 font-normal">(اختیاری)</span>
          </label>
          <textarea
            id="editDecisionWhy"
            rows={2}
            maxLength={400}
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            placeholder="پیامدها یا دلایل اهمیت تصمیم..."
            className="w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2 text-sm text-ink focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>

        {error && <p className="text-xs font-bold text-danger">{error}</p>}
      </form>
    </Modal>
  );
};
