import type { ReportClipRow } from "./queries";

export interface ReportFilters {
  from: string;
  to: string;
  temporada: string;
  teamId: string;
  refereeId: string;
  situation: string;
  whistleType: string;
  evaluation: string;
}

export const EMPTY_FILTERS: ReportFilters = {
  from: "",
  to: "",
  temporada: "",
  teamId: "",
  refereeId: "",
  situation: "",
  whistleType: "",
  evaluation: "",
};

export function applyReportFilters(clips: ReportClipRow[], f: ReportFilters): ReportClipRow[] {
  return clips.filter((c) => {
    if (f.from && (!c.fecha || c.fecha < f.from)) return false;
    if (f.to && (!c.fecha || c.fecha > f.to)) return false;
    if (f.temporada && c.partidoTemporada !== f.temporada) return false;
    if (f.teamId && c.teamLocal?.id !== f.teamId && c.teamVisit?.id !== f.teamId) return false;
    if (f.refereeId && c.referee?.id !== f.refereeId) return false;
    if (f.situation && c.situation !== f.situation) return false;
    if (f.whistleType && c.whistleType !== f.whistleType) return false;
    if (f.evaluation && c.evaluation !== f.evaluation) return false;
    return true;
  });
}

export function filtersToSearchParams(f: ReportFilters): URLSearchParams {
  const params = new URLSearchParams();
  (Object.keys(f) as (keyof ReportFilters)[]).forEach((key) => {
    if (f[key]) params.set(key, f[key]);
  });
  return params;
}

export function searchParamsToFilters(sp: Record<string, string | string[] | undefined>): ReportFilters {
  function str(v: string | string[] | undefined): string {
    return typeof v === "string" ? v : "";
  }
  return {
    from: str(sp.from),
    to: str(sp.to),
    temporada: str(sp.temporada),
    teamId: str(sp.teamId),
    refereeId: str(sp.refereeId),
    situation: str(sp.situation),
    whistleType: str(sp.whistleType),
    evaluation: str(sp.evaluation),
  };
}
