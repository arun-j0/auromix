import {
  collection,
  doc,
  setDoc,
  Timestamp,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Function to generate a unique order number (you can customize this)
const generateOrderNumber = () => {
  const timestamp = new Date().getTime().toString();
  const randomNumber = Math.floor(Math.random() * 1000).toString();
  return `ORD-${timestamp}-${randomNumber}`;
};

export interface OrderProduct {
  id: string;
  productId: string; // Reference to products collection
  productName: string;
  productType: "sweater" | "tshirt" | "thread_craft" | "handmade_craft";
  quantity: number;
  specifications: string; // Custom specifications for this order
  deadline: Date;
  status:
    | "pending"
    | "assigned"
    | "in_progress"
    | "ready_for_review"
    | "completed"
    | "delivered";
  assignedTo?: string; // User ID
  assignedBy?: string; // User ID
  assignmentDate?: Date;
  completedDate?: Date;
  deliveredDate?: Date;
  basePrice: number; // Price from product catalog
  creationCost: number; // Cost from product catalog
  totalPrice: number; // basePrice * quantity
  totalCost: number; // creationCost * quantity
}

export interface Order {
  id: string;
  orderNumber: string;
  clientCompanyId: string;
  clientCompanyName: string;
  products: OrderProduct[]; // Updated to use OrderProduct
  totalQuantity: number;
  totalValue: number; // Sum of all product totalPrice
  totalCost: number; // Sum of all product totalCost
  dueDate: Date;
  deliveryDate: Date;
  status:
    | "pending"
    | "in_progress"
    | "ready_for_review"
    | "completed"
    | "delivered";
  notes: string;
  specialInstructions: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  assignedAgents?: string[];
  assignedEmployees?: string[];
  deliveredAt?: Date;
  deliveredBy?: string;
}

export const createOrder = async (
  orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
) => {
  try {
    const orderRef = doc(collection(db, "orders"));

    // Calculate totals
    const totalQuantity = orderData.products.reduce(
      (sum, product) => sum + product.quantity,
      0
    );
    const totalValue = orderData.products.reduce(
      (sum, product) => sum + product.totalPrice,
      0
    );
    const totalCost = orderData.products.reduce(
      (sum, product) => sum + product.totalCost,
      0
    );

    const order: Order = {
      ...orderData,
      id: orderRef.id,
      orderNumber: generateOrderNumber(),
      totalQuantity,
      totalValue,
      totalCost,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedAgents: orderData.assignedAgents || [],
      assignedEmployees: orderData.assignedEmployees || [],
    };

    await setDoc(orderRef, {
      ...order,
      dueDate: Timestamp.fromDate(order.dueDate),
      deliveryDate: Timestamp.fromDate(order.deliveryDate),
      createdAt: Timestamp.fromDate(order.createdAt),
      updatedAt: Timestamp.fromDate(order.updatedAt),
      deliveredAt: order.deliveredAt
        ? Timestamp.fromDate(order.deliveredAt)
        : null,
      products: order.products.map((product) => ({
        ...product,
        deadline: Timestamp.fromDate(product.deadline),
        assignmentDate: product.assignmentDate
          ? Timestamp.fromDate(product.assignmentDate)
          : null,
        completedDate: product.completedDate
          ? Timestamp.fromDate(product.completedDate)
          : null,
        deliveredDate: product.deliveredDate
          ? Timestamp.fromDate(product.deliveredDate)
          : null,
      })),
      assignedAgents: order.assignedAgents,
      assignedEmployees: order.assignedEmployees,
    });

    return order;
  } catch (error: any) {
    throw new Error(`Failed to create order: ${error.message}`);
  }
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    if (!orderDoc.exists()) {
      return null;
    }

    const data = orderDoc.data();
    return {
      ...data,
      dueDate: data.dueDate?.toDate() || new Date(),
      deliveryDate: data.deliveryDate?.toDate() || new Date(),
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      deliveredAt: data.deliveredAt?.toDate(),
      products: data.products.map((product: any) => ({
        ...product,
        deadline: product.deadline?.toDate() || new Date(),
        assignmentDate: product.assignmentDate?.toDate(),
        completedDate: product.completedDate?.toDate(),
        deliveredDate: product.deliveredDate?.toDate(),
      })),
    } as Order;
  } catch (error: any) {
    throw new Error(`Failed to get order: ${error.message}`);
  }
};

export const getAllOrders = async (): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );
    const ordersSnapshot = await getDocs(ordersQuery);

    return ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate?.toDate() || new Date(),
        deliveryDate: data.deliveryDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deliveredAt: data.deliveredAt?.toDate(),
        products: data.products.map((product: any) => ({
          ...product,
          deadline: product.deadline?.toDate() || new Date(),
          assignmentDate: product.assignmentDate?.toDate(),
          completedDate: product.completedDate?.toDate(),
          deliveredDate: product.deliveredDate?.toDate(),
        })),
      } as Order;
    });
  } catch (error: any) {
    throw new Error(`Failed to get orders: ${error.message}`);
  }
};

export const getOrdersAssignedToAgent = async (
  agentId: string
): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("assignedAgents", "array-contains", agentId),
      orderBy("createdAt", "desc")
    );
    const ordersSnapshot = await getDocs(ordersQuery);

    return ordersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        dueDate: data.dueDate?.toDate() || new Date(),
        deliveryDate: data.deliveryDate?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        deliveredAt: data.deliveredAt?.toDate(),
        products: data.products.map((product: any) => ({
          ...product,
          deadline: product.deadline?.toDate() || new Date(),
          assignmentDate: product.assignmentDate?.toDate(),
          completedDate: product.completedDate?.toDate(),
          deliveredDate: product.deliveredDate?.toDate(),
        })),
      } as Order;
    });
  } catch (error: any) {
    throw new Error(`Failed to get orders assigned to agent: ${error.message}`);
  }
};

export const updateOrder = async (orderId: string, updates: Partial<Order>) => {
  try {
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    if (updates.deliveryDate) {
      updateData.deliveryDate = Timestamp.fromDate(updates.deliveryDate);
    }
    if (updates.deliveredAt) {
      updateData.deliveredAt = Timestamp.fromDate(updates.deliveredAt);
    }
    if (updates.products) {
      updateData.products = updates.products.map((product) => ({
        ...product,
        deadline: Timestamp.fromDate(product.deadline),
        assignmentDate: product.assignmentDate
          ? Timestamp.fromDate(product.assignmentDate)
          : null,
        completedDate: product.completedDate
          ? Timestamp.fromDate(product.completedDate)
          : null,
        deliveredDate: product.deliveredDate
          ? Timestamp.fromDate(product.deliveredDate)
          : null,
      }));
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(
      doc(db, "orders", orderId),
      cleanUpdates as { [key: string]: any }
    );
  } catch (error: any) {
    throw new Error(`Failed to update order: ${error.message}`);
  }
};

export const addAgentToOrder = async (orderId: string, agentId: string) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      assignedAgents: arrayUnion(agentId),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error: any) {
    throw new Error(`Failed to add agent to order: ${error.message}`);
  }
};

export const addEmployeeToOrder = async (
  orderId: string,
  employeeId: string
) => {
  try {
    await updateDoc(doc(db, "orders", orderId), {
      assignedEmployees: arrayUnion(employeeId),
      updatedAt: Timestamp.fromDate(new Date()),
    });
  } catch (error: any) {
    throw new Error(`Failed to add employee to order: ${error.message}`);
  }
};

export const markOrderAsDelivered = async (
  orderId: string,
  deliveredBy: string
) => {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updatedProducts = order.products.map((product) => ({
      ...product,
      status: "delivered" as const,
      deliveredDate: new Date(),
    }));

    await updateOrder(orderId, {
      status: "delivered",
      products: updatedProducts,
      deliveredAt: new Date(),
      deliveredBy,
    });
  } catch (error: any) {
    throw new Error(`Failed to mark order as delivered: ${error.message}`);
  }
};

export const getAssigmentsByOrderId = async (orderId: string) => {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const assignments = order.products.map((product) => ({
      productId: product.productId,
      assignedTo: product.assignedTo,
      status: product.status,
      assignmentDate: product.assignmentDate,
      completedDate: product.completedDate,
      deliveredDate: product.deliveredDate,
    }));

    return assignments;
  } catch (error: any) {
    throw new Error(
      `Failed to get assignments for order ${orderId}: ${error.message}`
    );
  }
};
