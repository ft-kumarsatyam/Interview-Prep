export interface RememberedStudyAction {
  href: string;
  title: string;
}

export const STUDY_ACTION_KEY = "prepos:next-action";
export const STUDY_ACTION_EVENT = "prepos-next-action";

export function rememberStudyAction(action: RememberedStudyAction): void {
  try {
    window.localStorage.setItem(STUDY_ACTION_KEY, JSON.stringify(action));
    window.dispatchEvent(new Event(STUDY_ACTION_EVENT));
  } catch {
    // Local storage is an enhancement; navigation must still work.
  }
}
