import type { UnsatisfiedModuleIssue } from '../dashboard-validation';

type UnsatisfiedModuleProps = {
  issue: UnsatisfiedModuleIssue;
};

export function UnsatisfiedModule({ issue }: UnsatisfiedModuleProps) {
  return (
    <div className="rounded-md border border-red-300 bg-red-100 px-3 py-2 text-xs font-medium text-red-800">
      <p className="font-bold">{issue.moduleCode} requirement issue</p>
      <ul className="mt-1 grid gap-1">
        {issue.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}
