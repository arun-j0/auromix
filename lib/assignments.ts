import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit as firebaseLimit,
} from "firebase/firestore";

export interface Assignment {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productSpecs: string;
  quantity: number;
  agentId: string;
  agentName: string;
  employeeId: string;
  employeeName: string;
  assignedBy: string; // admin or agent ID
  assignedByName: string;
  status: "pending" | "approved" | "rejected" | "in_progress" | "completed";
  deadline: Date;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

export const createAssignment = async (
  assignmentData: Omit<Assignment, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const assignmentRef = doc(collection(db, "assignments"));
    const assignment: Assignment = {
      ...assignmentData,
      id: assignmentRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(assignmentRef, {
      ...assignment,
      deadline: Timestamp.fromDate(assignment.deadline),
      createdAt: Timestamp.fromDate(assignment.createdAt),
      updatedAt: Timestamp.fromDate(assignment.updatedAt),
      approvedAt: assignment.approvedAt
        ? Timestamp.fromDate(assignment.approvedAt)
        : null,
      rejectedAt: assignment.rejectedAt
        ? Timestamp.fromDate(assignment.rejectedAt)
        : null,
      startedAt: assignment.startedAt
        ? Timestamp.fromDate(assignment.startedAt)
        : null,
      completedAt: assignment.completedAt
        ? Timestamp.fromDate(assignment.completedAt)
        : null,
    });

    return assignment;
  } catch (error: any) {
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
};

export const getAssignment = async (
  assignmentId: string
): Promise<Assignment | null> => {
  try {
    const assignmentDoc = await getDoc(doc(db, "assignments", assignmentId));
    if (!assignmentDoc.exists()) {
      return null;
    }

    const data = assignmentDoc.data();
    return {
      ...data,
      deadline: data.deadline?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      approvedAt: data.approvedAt?.toDate(),
      rejectedAt: data.rejectedAt?.toDate(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as Assignment;
  } catch (error: any) {
    throw new Error(`Failed to get assignment: ${error.message}`);
  }
};

export const getAllAssignments = async (): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments: ${error.message}`);
  }
};

export const getAssignmentsByAgent = async (
  agentId: string,
  limitCount?: number
): Promise<Assignment[]> => {
  try {
    let assignmentsQuery = query(
      collection(db, "assignments"),
      where("agentId", "==", agentId),
      orderBy("createdAt", "desc")
    );
    if (limitCount) {
      assignmentsQuery = query(assignmentsQuery, firebaseLimit(limitCount));
    }
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments by agent: ${error.message}`);
  }
};

export const getAssignmentsByEmployee = async (
  employeeId: string,
  limitCount?: number
): Promise<Assignment[]> => {
  try {
    let assignmentsQuery = query(
      collection(db, "assignments"),
      where("employeeId", "==", employeeId),
      orderBy("createdAt", "desc")
    );
    if (limitCount) {
      assignmentsQuery = query(assignmentsQuery, firebaseLimit(limitCount));
    }
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments by employee: ${error.message}`);
  }
};

export const getPendingAssignments = async (): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get pending assignments: ${error.message}`);
  }
};

export const getAgentSubmittedAssignments = async (
  agentId: string
): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("assignedBy", "==", agentId), // Assuming 'assignedBy' stores the UID of the agent who created it
      where("status", "in", ["pending", "approved", "rejected"]), // Filter for relevant statuses
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);

    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        deadline: data.deadline?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        approvedAt: data.approvedAt?.toDate(),
        rejectedAt: data.rejectedAt?.toDate(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(
      `Failed to get agent submitted assignments: ${error.message}`
    );
  }
};

export const updateAssignment = async (
  assignmentId: string,
  updates: Partial<Assignment>
) => {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Convert dates to Timestamps
    if (updates.deadline)
      updateData.deadline = Timestamp.fromDate(updates.deadline);
    if (updates.approvedAt)
      updateData.approvedAt = Timestamp.fromDate(updates.approvedAt);
    if (updates.rejectedAt)
      updateData.rejectedAt = Timestamp.fromDate(updates.rejectedAt);
    if (updates.startedAt)
      updateData.startedAt = Timestamp.fromDate(updates.startedAt);
    if (updates.completedAt)
      updateData.completedAt = Timestamp.fromDate(updates.completedAt);

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(doc(db, "assignments", assignmentId), cleanUpdates);
  } catch (error: any) {
    throw new Error(`Failed to update assignment: ${error.message}`);
  }
};

export const approveAssignment = async (
  assignmentId: string,
  approvedBy: string
) => {
  try {
    await updateAssignment(assignmentId, {
      status: "approved",
      approvedAt: new Date(),
      approvedBy,
    });
  } catch (error: any) {
    throw new Error(`Failed to approve assignment: ${error.message}`);
  }
};

export const rejectAssignment = async (
  assignmentId: string,
  rejectedBy: string,
  rejectionReason: string
) => {
  try {
    await updateAssignment(assignmentId, {
      status: "rejected",
      rejectedAt: new Date(),
      rejectedBy,
      rejectionReason,
    });
  } catch (error: any) {
    throw new Error(`Failed to reject assignment: ${error.message}`);
  }
};

export const startAssignment = async (assignmentId: string) => {
  try {
    await updateAssignment(assignmentId, {
      status: "in_progress",
      startedAt: new Date(),
    });
  } catch (error: any) {
    throw new Error(`Failed to start assignment: ${error.message}`);
  }
};

export const completeAssignment = async (
  assignmentId: string,
  notes?: string
) => {
  try {
    await updateAssignment(assignmentId, {
      status: "completed",
      completedAt: new Date(),
      notes,
    });
  } catch (error: any) {
    throw new Error(`Failed to complete assignment: ${error.message}`);
  }
};
