import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  type: "sweater" | "tshirt" | "thread_craft" | "handmade_craft";
  quantity: number;
  specifications: string;
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
}

export interface Order {
  id: string;
  orderNumber: string;
  clientCompanyId: string;
  clientCompanyName: string;
  products: Product[];
  totalQuantity: number;
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
  assignedAgents?: string[]; // Array of agent UIDs
  assignedEmployees?: string[]; // Array of employee UIDs (for direct assignments)
}

export const generateOrderNumber = () => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `ORD-${timestamp}-${random}`;
};

export const createOrder = async (
  orderData: Omit<Order, "id" | "orderNumber" | "createdAt" | "updatedAt">
) => {
  try {
    const orderRef = doc(collection(db, "orders"));
    const order: Order = {
      ...orderData,
      id: orderRef.id,
      orderNumber: generateOrderNumber(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(orderRef, {
      ...order,
      dueDate: Timestamp.fromDate(order.dueDate),
      deliveryDate: Timestamp.fromDate(order.deliveryDate),
      createdAt: Timestamp.fromDate(order.createdAt),
      updatedAt: Timestamp.fromDate(order.updatedAt),
      products: order.products.map((product) => ({
        ...product,
        deadline: Timestamp.fromDate(product.deadline),
        assignmentDate: product.assignmentDate
          ? Timestamp.fromDate(product.assignmentDate)
          : null,
        completedDate: product.completedDate
          ? Timestamp.fromDate(product.completedDate)
          : null,
      })),
      assignedAgents: order.assignedAgents || [],
      assignedEmployees: order.assignedEmployees || [],
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
      products: data.products.map((product: any) => ({
        ...product,
        deadline: product.deadline?.toDate() || new Date(),
        assignmentDate: product.assignmentDate
          ? product.assignmentDate.toDate()
          : undefined,
        completedDate: product.completedDate
          ? product.completedDate.toDate()
          : undefined,
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
        products: data.products.map((product: any) => ({
          ...product,
          deadline: product.deadline?.toDate() || new Date(),
          assignmentDate: product.assignmentDate
            ? product.assignmentDate.toDate()
            : undefined,
          completedDate: product.completedDate
            ? product.completedDate.toDate()
            : undefined,
        })),
      } as Order;
    });
  } catch (error: any) {
    throw new Error(`Failed to get orders: ${error.message}`);
  }
};

export const getOrdersByCompany = async (
  companyId: string
): Promise<Order[]> => {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("clientCompanyId", "==", companyId),
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
        products: data.products.map((product: any) => ({
          ...product,
          deadline: product.deadline?.toDate() || new Date(),
          assignmentDate: product.assignmentDate
            ? product.assignmentDate.toDate()
            : undefined,
          completedDate: product.completedDate
            ? product.completedDate.toDate()
            : undefined,
        })),
      } as Order;
    });
  } catch (error: any) {
    throw new Error(`Failed to get orders by company: ${error.message}`);
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
        products: data.products.map((product: any) => ({
          ...product,
          deadline: product.deadline?.toDate() || new Date(),
          assignmentDate: product.assignmentDate
            ? product.assignmentDate.toDate()
            : undefined,
          completedDate: product.completedDate
            ? product.completedDate.toDate()
            : undefined,
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
      }));
    }

    // Ensure assignedAgents and assignedEmployees are arrays
    if (updates.assignedAgents) {
      updateData.assignedAgents = updates.assignedAgents;
    }
    if (updates.assignedEmployees) {
      updateData.assignedEmployees = updates.assignedEmployees;
    }

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(doc(db, "orders", orderId), cleanUpdates);
  } catch (error: any) {
    throw new Error(`Failed to update order: ${error.message}`);
  }
};

export const deleteOrder = async (orderId: string) => {
  try {
    await deleteDoc(doc(db, "orders", orderId));
  } catch (error: any) {
    throw new Error(`Failed to delete order: ${error.message}`);
  }
};

export const updateProductStatus = async (
  orderId: string,
  productId: string,
  status: Product["status"],
  userId: string
) => {
  try {
    const order = await getOrder(orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    const updatedProducts = order.products.map((product) => {
      if (product.id === productId) {
        const updatedProduct = { ...product, status };
        if (status === "completed") {
          updatedProduct.completedDate = new Date();
        }
        return updatedProduct;
      }
      return product;
    });

    // Update overall order status based on product statuses
    let orderStatus: Order["status"] = "pending";
    const allCompleted = updatedProducts.every(
      (p) => p.status === "completed" || p.status === "delivered"
    );
    const anyInProgress = updatedProducts.some(
      (p) => p.status === "in_progress" || p.status === "ready_for_review"
    );
    const anyAssigned = updatedProducts.some((p) => p.status === "assigned");

    if (allCompleted) {
      orderStatus = "completed";
    } else if (anyInProgress) {
      orderStatus = "in_progress";
    } else if (anyAssigned) {
      orderStatus = "in_progress";
    }

    await updateOrder(orderId, {
      products: updatedProducts,
      status: orderStatus,
    });
  } catch (error: any) {
    throw new Error(`Failed to update product status: ${error.message}`);
  }
};
