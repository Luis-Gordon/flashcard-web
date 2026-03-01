import { describe, it, expect } from "vitest";
import { changePasswordSchema } from "@/lib/validation/auth";

describe("changePasswordSchema", () => {
  it("accepts valid matching passwords", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "securePass123",
      confirmPassword: "securePass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain("Password must be at least 8 characters");
    }
  });

  it("rejects mismatched passwords", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "securePass123",
      confirmPassword: "differentPass456",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmIssue = result.error.issues.find(
        (i) => i.path.includes("confirmPassword"),
      );
      expect(confirmIssue?.message).toBe("Passwords don't match");
    }
  });

  it("rejects empty fields", () => {
    const result = changePasswordSchema.safeParse({
      newPassword: "",
      confirmPassword: "",
    });
    expect(result.success).toBe(false);
  });
});
