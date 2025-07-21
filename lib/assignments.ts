import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
} from "firebase/firestore";
import {
  notifyAssignmentCreated,
  notifyAssignmentApproved,
  notifyAssignmentRejected,
  createNotification,
} from "./notifications";

export interface Assignment {
  id: string;
  orderId: string;
  orderNumber: string;
  productId: string;
  productName: string;
  productSpecs: string;
  agentId: string;
  agentName: string;
  employeeId: string;
  employeeName: string;
  quantity: number;
  deadline: Date;
  status: "pending" | "approved" | "rejected" | "in_progress" | "completed";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string; // Additional notes from the agent
  assignedBy?: string; // User ID of the agent who assigned
  assignedByName?: string; // Name of the agent who assigned
  approvedAt?: Date; // When the assignment was approved
  approvedBy?: string; // User ID of the admin who approved
  rejectedAt?: Date; // When the assignment was rejected
  rejectedBy?: string; // User ID of the admin who rejected
}

export const createAssignment = async (
  assignmentData: Omit<Assignment, "id" | "createdAt">
) => {
  try {
    const assignmentRef = doc(collection(db, "assignments"));
    const assignment: Assignment = {
      ...assignmentData,
      id: assignmentRef.id,
      status: "pending",
      createdAt: new Date(),
    };

    await setDoc(assignmentRef, {
      ...assignment,
      createdAt: Timestamp.fromDate(assignment.createdAt),
      deadline: Timestamp.fromDate(assignment.deadline),
    });

    // Notify the employee about the new assignment
    await notifyAssignmentCreated(assignmentData.employeeId, {
      assignmentId: assignment.id,
      productName: assignmentData.productName,
      agentName: assignmentData.agentName,
    });

    // Notify admin about pending approval
    const adminsQuery = query(
      collection(db, "users"),
      where("role", "==", "admin")
    );
    const adminsSnapshot = await getDocs(adminsQuery);

    for (const adminDoc of adminsSnapshot.docs) {
      await createNotification({
        userId: adminDoc.id,
        title: "New Assignment Pending Approval",
        message: `${assignmentData.agentName} has created an assignment for ${assignmentData.productName} that requires your approval.`,
        type: "assignment",
        isRead: false,
        data: {
          assignmentId: assignment.id,
          productName: assignmentData.productName,
          agentName: assignmentData.agentName,
        },
      });
    }

    return assignment;
  } catch (error: any) {
    throw new Error(`Failed to create assignment: ${error.message}`);
  }
};

export const getAssignmentsByAgent = async (
  agentId: string
): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("agentId", "==", agentId),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments by agent: ${error.message}`);
  }
};

export const getAssignmentsByEmployee = async (
  employeeId: string
): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("employeeId", "==", employeeId),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments by employee: ${error.message}`);
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
        createdAt: data.createdAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get all assignments: ${error.message}`);
  }
};

export const approveAssignment = async (
  assignmentId: string,
  reviewerId: string
) => {
  try {
    const assignmentRef = doc(db, "assignments", assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      throw new Error("Assignment not found");
    }

    const assignmentData = assignmentDoc.data() as Assignment;

    await updateDoc(assignmentRef, {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: Timestamp.fromDate(new Date()),
    });

    // Notify the employee that assignment is approved
    await notifyAssignmentApproved(assignmentData.employeeId, {
      assignmentId,
      productName: assignmentData.productName,
    });

    // Notify the agent that assignment is approved
    await createNotification({
      userId: assignmentData.agentId,
      title: "Assignment Approved",
      message: `Your assignment for ${assignmentData.productName} has been approved by admin.`,
      type: "assignment",
      isRead: false,
      data: {
        assignmentId,
        productName: assignmentData.productName,
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to approve assignment: ${error.message}`);
  }
};

export const rejectAssignment = async (
  assignmentId: string,
  reason: string
) => {
  try {
    const assignmentRef = doc(db, "assignments", assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      throw new Error("Assignment not found");
    }

    const assignmentData = assignmentDoc.data() as Assignment;

    await updateDoc(assignmentRef, {
      status: "rejected",
      rejectionReason: reason,
      reviewedAt: Timestamp.fromDate(new Date()),
    });

    // Notify the employee that assignment is rejected
    await notifyAssignmentRejected(assignmentData.employeeId, {
      assignmentId,
      productName: assignmentData.productName,
      reason,
    });

    // Notify the agent that assignment is rejected
    await createNotification({
      userId: assignmentData.agentId,
      title: "Assignment Rejected",
      message: `Your assignment for ${assignmentData.productName} has been rejected. Reason: ${reason}`,
      type: "assignment",
      isRead: false,
      data: {
        assignmentId,
        productName: assignmentData.productName,
        reason,
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to reject assignment: ${error.message}`);
  }
};

export const startAssignment = async (assignmentId: string) => {
  try {
    await updateDoc(doc(db, "assignments", assignmentId), {
      status: "in_progress",
      startedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error: any) {
    throw new Error(`Failed to start assignment: ${error.message}`);
  }
};

export const completeAssignment = async (assignmentId: string) => {
  try {
    const assignmentRef = doc(db, "assignments", assignmentId);
    const assignmentDoc = await getDoc(assignmentRef);

    if (!assignmentDoc.exists()) {
      throw new Error("Assignment not found");
    }

    const assignmentData = assignmentDoc.data() as Assignment;

    await updateDoc(assignmentRef, {
      status: "completed",
      completedAt: Timestamp.fromDate(new Date()),
    });

    // Notify the agent that assignment is completed
    await createNotification({
      userId: assignmentData.agentId,
      title: "Assignment Completed",
      message: `${assignmentData.employeeName} has completed the assignment for ${assignmentData.productName}.`,
      type: "assignment",
      isRead: false,
      data: {
        assignmentId,
        productName: assignmentData.productName,
        employeeName: assignmentData.employeeName,
      },
    });

    // Notify admin that assignment is completed
    const adminsQuery = query(
      collection(db, "users"),
      where("role", "==", "admin")
    );
    const adminsSnapshot = await getDocs(adminsQuery);

    for (const adminDoc of adminsSnapshot.docs) {
      await createNotification({
        userId: adminDoc.id,
        title: "Assignment Completed",
        message: `${assignmentData.employeeName} has completed the assignment for ${assignmentData.productName}.`,
        type: "assignment",
        isRead: false,
        data: {
          assignmentId,
          productName: assignmentData.productName,
          employeeName: assignmentData.employeeName,
        },
      });
    }
  } catch (error: any) {
    throw new Error(`Failed to complete assignment: ${error.message}`);
  }
};

export const getAgentSubmittedAssignments = async (
  agentId: string
): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("agentId", "==", agentId),
      where("status", "in", ["pending", "approved", "rejected"]),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(
      `Failed to get agent submitted assignments: ${error.message}`
    );
  }
};

export const getAssignmentsByOrder = async (
  orderId: string
): Promise<Assignment[]> => {
  try {
    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("orderId", "==", orderId),
      orderBy("createdAt", "desc")
    );
    const assignmentsSnapshot = await getDocs(assignmentsQuery);
    return assignmentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        deadline: data.deadline?.toDate() || new Date(),
        startedAt: data.startedAt?.toDate(),
        completedAt: data.completedAt?.toDate(),
        reviewedAt: data.reviewedAt?.toDate(),
      } as Assignment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get assignments by order: ${error.message}`);
  }
};
