// ─────────────────────────────────────────────────────────────
// Context passport + rescue service.
//
// Mock-backed today (lib/data/passports.ts). The live backend
// exposes sessions, runs and compare jobs under apps/api.
// ─────────────────────────────────────────────────────────────

import { PASSPORTS, PASSPORT_BY_ID, RESCUE_REPORTS, REPORT_BY_ID } from "@/lib/data/passports";
import type { ContextPassport, RescueReport } from "@/lib/types";

export interface PassportService {
  listPassports(): Promise<ContextPassport[]>;
  getPassport(id: string): Promise<ContextPassport | null>;
  listRescueReports(): Promise<RescueReport[]>;
  getRescueReport(id: string): Promise<RescueReport | null>;
}

export const passportService: PassportService = {
  async listPassports() {
    return PASSPORTS;
  },

  async getPassport(id) {
    return PASSPORT_BY_ID[id] ?? null;
  },

  async listRescueReports() {
    return RESCUE_REPORTS;
  },

  async getRescueReport(id) {
    return REPORT_BY_ID[id] ?? null;
  },
};
