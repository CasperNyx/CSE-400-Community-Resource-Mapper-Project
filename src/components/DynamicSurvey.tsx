"use client";

import { getSurveyCategory, surveyCategories } from "@/data/surveyConfig";

type Props = {
  category: string;
  answers: Record<string, string>;
  disabled?: boolean;
  onCategoryChange: (category: string) => void;
  onAnswersChange: (answers: Record<string, string>) => void;
};

export default function DynamicSurvey({ category, answers, disabled, onCategoryChange, onAnswersChange }: Props) {
  const survey = getSurveyCategory(category);
  const setAnswer = (name: string, value: string) => onAnswersChange({ ...answers, [name]: value });

  return (
    <>
      <label className="flex flex-col gap-1 text-sm font-semibold text-gray-700">
        Initial resource category
        <select value={category} disabled={disabled} onChange={(event) => onCategoryChange(event.target.value)} className="rounded-xl border border-gray-200 bg-gray-50 p-3 focus:outline-none focus:ring-2 focus:ring-blue-600">
          {surveyCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>
      {survey && <div className="grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-3 sm:grid-cols-2">
        {survey.fields.map((field) => <label key={field.name} className={`flex flex-col gap-1 text-sm font-medium text-gray-700 ${field.type === "textarea" ? "sm:col-span-2" : ""}`}>
          {field.label}{field.required ? " *" : ""}
          {field.type === "select" ? <select value={answers[field.name] || ""} required={field.required} disabled={disabled} onChange={(event) => setAnswer(field.name, event.target.value)} className="rounded-xl border border-gray-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-600">
            <option value="">Select an option</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
          </select> : field.type === "textarea" ? <textarea value={answers[field.name] || ""} required={field.required} disabled={disabled} onChange={(event) => setAnswer(field.name, event.target.value)} placeholder={field.placeholder} rows={2} className="resize-none rounded-xl border border-gray-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-600" /> : <input type={field.type} value={answers[field.name] || ""} required={field.required} disabled={disabled} min={field.min} onChange={(event) => setAnswer(field.name, event.target.value)} placeholder={field.placeholder} className="rounded-xl border border-gray-200 bg-white p-3 focus:outline-none focus:ring-2 focus:ring-blue-600" />}
        </label>)}
      </div>}
    </>
  );
}
