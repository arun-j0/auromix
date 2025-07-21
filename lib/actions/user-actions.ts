// lib/actions/user-actions.ts
"use server";

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { revalidatePath } from "next/cache";
const { Timestamp } = require("firebase-admin/firestore");

import { User } from "@/lib/users";

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: "admin" | "agent" | "employee";
  agentId?: string;
  skills?: string[];
  isActive?: boolean;
}

export async function createUserAction(userData: CreateUserData) {
  try {
    // Get Firebase Admin instances
    const { adminAuth, adminDb } = await getFirebaseAdmin();

    // Create user in Firebase Auth using Admin SDK
    const userRecord = await adminAuth.createUser({
      email: userData.email,
      password: userData.password,
      displayName: userData.name,
      phoneNumber: userData.phone || undefined,
      disabled: !userData.isActive,
    });

    // Prepare user document data
    const userDocData: any = {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      isActive: userData.isActive ?? true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Add optional fields if they exist
    if (userData.phone) {
      userDocData.phone = userData.phone;
    }

    if (userData.skills && userData.skills.length > 0) {
      userDocData.skills = userData.skills;
    }

    if (userData.role === "employee" && userData.agentId) {
      userDocData.agentId = userData.agentId;
    }

    // Save user data to Firestore
    await adminDb.collection("users").doc(userRecord.uid).set(userDocData);

    // Set custom claims for role-based access
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      role: userData.role,
    });

    // Revalidate the users page to show updated data
    revalidatePath("/admin/users");

    return {
      success: true,
      uid: userRecord.uid,
      message: `User ${userData.name} created successfully!`,
    };
  } catch (error: any) {
    console.error("Error creating user:", error);

    // Check if it's a Firebase Admin installation issue
    if (error.message.includes("Firebase Admin SDK not found")) {
      return {
        success: false,
        error:
          "Firebase Admin SDK is not properly installed. Please run: npm install firebase-admin",
      };
    }

    // Return more specific error messages
    if (error.code === "auth/email-already-exists") {
      return {
        success: false,
        error: "An account with this email already exists.",
      };
    } else if (error.code === "auth/invalid-email") {
      return {
        success: false,
        error: "Invalid email address.",
      };
    } else if (error.code === "auth/weak-password") {
      return {
        success: false,
        error: "Password is too weak. Must be at least 6 characters.",
      };
    }

    return {
      success: false,
      error: error.message || "Failed to create user. Please try again.",
    };
  }
}

export async function getAgentsAction() {
  try {
    const { adminDb } = await getFirebaseAdmin();

    const snapshot = await adminDb
      .collection("users")
      .where("role", "==", "agent")
      .where("isActive", "==", true)
      .get();

    const agents: User[] = snapshot.docs.map((doc: any) => ({
      uid: doc.id,
      name: doc.data().name,
      email: doc.data().email,
      phone: doc.data().phone,
      role: doc.data().role,
      agentId: doc.data().agentId,
      skills: doc.data().skills,
      isActive: doc.data().isActive,
      createdAt: doc.data().createdAt
        ? new Date(doc.data().createdAt)
        : new Date(),
      updatedAt: doc.data().updatedAt
        ? new Date(doc.data().updatedAt)
        : new Date(),
    }));

    return { success: true, data: agents };
  } catch (error: any) {
    console.error("Error fetching agents:", error);
    return {
      success: false,
      error: "Failed to load agents",
      data: [] as User[],
    };
  }
}

export async function sendWelcomeNotification(
  userId: string,
  userData: { name: string; role: string }
) {
  try {
    const { adminDb } = await getFirebaseAdmin();

    // Add notification to user's notifications collection
    await adminDb
      .collection("users")
      .doc(userId)
      .collection("notifications")
      .add({
        type: "welcome",
        title: "Welcome to the Platform!",
        message: `Hello ${userData.name}! Your ${userData.role} account has been created successfully.`,
        read: false,
        createdAt: new Date().toISOString(),
      });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending welcome notification:", error);
    return { success: false, error: error.message };
  }
}
