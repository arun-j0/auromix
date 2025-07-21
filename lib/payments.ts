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
} from "firebase/firestore";

export interface Payment {
  id: string;
  employeeId: string;
  employeeName: string;
  assignmentId: string;
  orderId: string;
  orderNumber: string;
  productName: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  completedAt: Date;
  paidAt?: Date;
  paidBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const createPayment = async (
  paymentData: Omit<Payment, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const paymentRef = doc(collection(db, "payments"));
    const payment: Payment = {
      ...paymentData,
      id: paymentRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(paymentRef, {
      ...payment,
      completedAt: Timestamp.fromDate(payment.completedAt),
      paidAt: payment.paidAt ? Timestamp.fromDate(payment.paidAt) : null,
      createdAt: Timestamp.fromDate(payment.createdAt),
      updatedAt: Timestamp.fromDate(payment.updatedAt),
    });

    return payment;
  } catch (error: any) {
    throw new Error(`Failed to create payment: ${error.message}`);
  }
};

export const getPaymentsByEmployee = async (
  employeeId: string
): Promise<Payment[]> => {
  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      where("employeeId", "==", employeeId),
      orderBy("completedAt", "desc")
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    return paymentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        completedAt: data.completedAt?.toDate() || new Date(),
        paidAt: data.paidAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Payment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get payments by employee: ${error.message}`);
  }
};

export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    const paymentsQuery = query(
      collection(db, "payments"),
      orderBy("completedAt", "desc")
    );
    const paymentsSnapshot = await getDocs(paymentsQuery);

    return paymentsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        completedAt: data.completedAt?.toDate() || new Date(),
        paidAt: data.paidAt?.toDate(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Payment;
    });
  } catch (error: any) {
    throw new Error(`Failed to get all payments: ${error.message}`);
  }
};

export const markPaymentAsPaid = async (
  paymentId: string,
  paidBy: string,
  notes?: string
) => {
  try {
    await updateDoc(doc(db, "payments", paymentId), {
      status: "paid",
      paidAt: Timestamp.fromDate(new Date()),
      paidBy,
      notes: notes || "",
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error: any) {
    throw new Error(`Failed to mark payment as paid: ${error.message}`);
  }
};
