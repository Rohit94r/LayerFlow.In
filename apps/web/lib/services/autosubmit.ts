import { apiFetch } from "@/lib/api/client";

export interface UserProfile {
  id?: string;
  fullName: string;
  email: string;
  phone?: string;
  collegeName?: string;
  rollNumber?: string;
  branchDepartment?: string;
  graduationYear?: string;
  bioDetails?: string;
  customFields?: Record<string, string>;
}

export interface FormSubmission {
  id: string;
  workspaceId: string;
  userId: string;
  formUrl: string;
  prompt?: string;
  status: "pending" | "processing" | "completed" | "failed";
  resultSummary?: string;
  emailNotificationSent: boolean;
  errorMessage?: string;
  createdAt: string;
}

export const autosubmitService = {
  async getProfile(): Promise<{ profile: UserProfile }> {
    return apiFetch("/api/autosubmit/profile");
  },

  async saveProfile(profile: UserProfile): Promise<{ profile: UserProfile }> {
    return apiFetch("/api/autosubmit/profile", {
      method: "POST",
      body: profile,
    });
  },

  async submitForm(data: { formUrl: string; prompt?: string }): Promise<{
    success: boolean;
    submission: FormSubmission;
    emailSent: boolean;
  }> {
    return apiFetch("/api/autosubmit/submit", {
      method: "POST",
      body: data,
    });
  },

  async getHistory(): Promise<{ history: FormSubmission[] }> {
    return apiFetch("/api/autosubmit/history");
  },
};
