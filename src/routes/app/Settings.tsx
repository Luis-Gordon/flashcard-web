import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import {
  changePasswordSchema,
  type ChangePasswordValues,
} from "@/lib/validation/auth";
import { exportAccountData, deleteAccount, ApiError } from "@/lib/api";
import { triggerDownload } from "@/lib/export/download";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Download,
  Loader2,
  Lock,
  Mail,
  Trash2,
  User,
  CalendarDays,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

// ---------------------------------------------------------------------------
// Settings page
// ---------------------------------------------------------------------------

export default function Settings() {
  const navigate = useNavigate();
  const { user, signOut, updatePassword } = useAuthStore();

  // Password form
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // Data export state
  const [isExporting, setIsExporting] = useState(false);

  // Delete account state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // -------------------------------------------------------------------------
  // Actions
  // -------------------------------------------------------------------------

  async function onChangePassword(values: ChangePasswordValues) {
    const { error } = await updatePassword(values.newPassword);
    if (error) {
      toast.error(error.message ?? "Failed to update password");
      return;
    }
    toast.success("Password updated");
    reset();
  }

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await exportAccountData();
      triggerDownload({
        content: JSON.stringify(data, null, 2),
        mimeType: "application/json",
        filename: `memogenesis-export-${new Date().toISOString().slice(0, 10)}.json`,
      });
      toast.success("Data exported successfully");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to export data";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      navigate("/");
      toast.success("Account deleted");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete account";
      toast.error(message);
      setIsDeleting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Account Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="font-medium">
                {user?.created_at ? formatDate(user.created_at) : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit(onChangePassword)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                placeholder="At least 8 characters"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your new password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Lock className="mr-2 h-4 w-4" />
              )}
              {isSubmitting ? "Updating..." : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Your Data</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Download a copy of your account data, including your cards, usage
            records, and generation history as a JSON file.
          </p>
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isExporting ? "Exporting..." : "Download my data"}
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-destructive">
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete my account
          </Button>

          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your account and all your data,
                  including saved cards, usage history, and generation records.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="confirm-email">
                  Type{" "}
                  <span className="font-semibold">{user?.email ?? ""}</span>{" "}
                  to confirm
                </Label>
                <Input
                  id="confirm-email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  autoComplete="off"
                />
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel
                  disabled={isDeleting}
                  onClick={() => setConfirmEmail("")}
                >
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={
                    confirmEmail !== (user?.email ?? "") || isDeleting
                  }
                  onClick={handleDeleteAccount}
                >
                  {isDeleting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isDeleting ? "Deleting..." : "Delete account permanently"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
