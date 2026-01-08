"use client";

/**
 * Biometric Credential Management Component
 * List, rename, and delete registered biometric credentials
 */

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { useBiometric } from "@/lib/biometric/use-biometric";

type CredentialManagementProps = {
  onCredentialAdded?: () => void;
  onCredentialRemoved?: () => void;
};

export function BiometricCredentialManager({
  onCredentialAdded,
  onCredentialRemoved,
}: CredentialManagementProps) {
  const {
    registeredCredentials,
    isLoading,
    fetchCredentials,
    removeCredential,
  } = useBiometric();

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const handleDeleteClick = (credentialId: string) => {
    setDeleteConfirm(credentialId);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (credentialId: string) => {
    try {
      setIsDeleting(credentialId);
      setDeleteError(null);

      await removeCredential(credentialId);

      setDeleteConfirm(null);
      setDeleteSuccess(credentialId);
      setIsDeleting(null);

      // Show success message for 3 seconds
      setTimeout(() => {
        setDeleteSuccess(null);
      }, 3000);

      onCredentialRemoved?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete credential";
      setDeleteError(message);
      setIsDeleting(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirm(null);
    setDeleteError(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (registeredCredentials.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 text-center">
        <p className="text-gray-600 text-sm">
          No biometric credentials registered yet.
        </p>
        <p className="mt-1 text-gray-500 text-xs">
          Register your first biometric credential to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {registeredCredentials.map((credential) => (
          <div
            className="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-sm"
            key={credential.id}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">
                  {credential.name || "Unnamed Credential"}
                </h3>

                <div className="mt-2 space-y-1 text-gray-500 text-xs">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    Registered:{" "}
                    {new Date(credential.createdAt).toLocaleDateString()}
                  </div>

                  {credential.lastUsedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3 w-3" />
                      Last used:{" "}
                      {new Date(credential.lastUsedAt).toLocaleDateString()}
                    </div>
                  )}

                  {credential.credentialDeviceType && (
                    <div>
                      Device:{" "}
                      {credential.credentialDeviceType === "single_device"
                        ? "Single Device"
                        : "Cross-Platform"}
                    </div>
                  )}

                  {credential.transports &&
                    credential.transports.length > 0 && (
                      <div>Transports: {credential.transports.join(", ")}</div>
                    )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 font-medium text-red-600 text-sm transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={
                    isDeleting === credential.id ||
                    deleteConfirm === credential.id
                  }
                  onClick={() => handleDeleteClick(credential.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            {/* Delete Confirmation */}
            {deleteConfirm === credential.id && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="mb-3 font-medium text-red-900 text-sm">
                  Are you sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    className="flex-1 rounded-lg bg-red-600 px-3 py-1 font-medium text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                    disabled={isDeleting === credential.id}
                    onClick={() => handleConfirmDelete(credential.id)}
                  >
                    {isDeleting === credential.id ? (
                      <>
                        <Loader className="mr-1 inline h-3 w-3 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      "Delete"
                    )}
                  </button>
                  <button
                    className="flex-1 rounded-lg border border-red-200 px-3 py-1 font-medium text-red-700 text-sm transition-colors hover:bg-red-100 disabled:opacity-50"
                    disabled={isDeleting === credential.id}
                    onClick={handleCancelDelete}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Delete Success */}
            {deleteSuccess === credential.id && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
                <p className="text-green-800 text-sm">
                  Credential deleted successfully
                </p>
              </div>
            )}

            {/* Delete Error */}
            {deleteError && deleteConfirm === credential.id && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
                  <p className="text-red-800 text-sm">{deleteError}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-blue-900 text-sm">
          <strong>{registeredCredentials.length}</strong> biometric credential
          {registeredCredentials.length !== 1 ? "s" : ""} registered
        </p>
        <p className="mt-1 text-blue-800 text-xs">
          You can use any of these credentials to log in securely.
        </p>
      </div>
    </div>
  );
}
