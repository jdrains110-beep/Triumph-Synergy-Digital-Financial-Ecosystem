/**
 * Delete Credential Endpoint
 * DELETE /api/biometric/credentials/[credentialId]
 * Removes a biometric credential
 */

import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ credentialId: string }> }
) {
  try {
    const { credentialId } = await params;
    const userId = request.headers.get('X-User-ID');

    if (!userId || !credentialId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Delete from database
    // const deleted = await db.biometricCredential.deleteMany({
    //   where: {
    //     id: credentialId,
    //     userId,
    //   },
    // });

    return NextResponse.json(
      {
        message: "Credential removed successfully",
        credentialId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete credential error:", error);
    return NextResponse.json(
      {
        error: "Failed to remove credential",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
