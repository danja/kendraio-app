import { Action } from '@ngrx/store';

export const RIN_LOAD_FILE = '[RIN] Load file';
export const RIN_IMPORT_RIN_DATA = '[RIN] Import RIN data';

export const CLEAR_PROJECTS = '[RIN] Clear projects';

export class RinLoadFileAction implements Action {
  readonly type = RIN_LOAD_FILE;
  constructor(public payload: File) {}
}

export class RinImportDataAction implements Action {
  readonly type = RIN_IMPORT_RIN_DATA;
  constructor(public payload: any) {}
}

export class ClearProjectsAction implements Action {
  readonly type = CLEAR_PROJECTS;
}

export type All
  = RinLoadFileAction
  | RinImportDataAction
  | ClearProjectsAction;
