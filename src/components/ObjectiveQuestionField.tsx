import type { ObjectiveQuestion } from "../shared/practiceTypes";

interface ObjectiveQuestionFieldProps {
  key?: string;
  question: ObjectiveQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ObjectiveQuestionField({ question, value, onChange, disabled = false }: ObjectiveQuestionFieldProps) {
  if (question.kind === "single") {
    return (
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="mb-3 text-sm font-semibold leading-6 text-[#3D3733] dark:text-[#f2eaf5]">
          <span className="mr-2 text-[#A16E28] dark:text-[#d6bdec]">{question.number}.</span>
          {question.prompt}
        </legend>
        {question.options?.map((option) => {
          const selected = value === option;
          return (
            <label key={option} className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm leading-5 transition-colors ${selected ? "border-[#E6B95C] bg-[#FFF8E7] text-[#5E4812] dark:border-[#7d5d99] dark:bg-[#33263e] dark:text-[#f8ebc4]" : "border-[#E8E2D6] bg-white text-[#625A55] hover:border-[#D7C7A8] dark:border-[#402c4c] dark:bg-[#25192e] dark:text-[#cbbbd3]"}`}>
              <input type="radio" name={question.id} value={option} checked={selected} onChange={() => onChange(option)} className="mt-0.5 accent-[#D18B22]" />
              <span>{option}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold leading-6 text-[#3D3733] dark:text-[#f2eaf5]">
        <span className="mr-2 text-[#A16E28] dark:text-[#d6bdec]">{question.number}.</span>
        {question.prompt}
      </span>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        className="h-11 w-full rounded-lg border border-[#DDD5C8] bg-white px-3 text-sm text-[#332E2A] outline-none transition focus:border-[#D18B22] focus:ring-2 focus:ring-[#F6D99A]/60 dark:border-[#493653] dark:bg-[#25192e] dark:text-white dark:focus:border-[#9e79b8]"
        placeholder="Type your answer"
      />
    </label>
  );
}


