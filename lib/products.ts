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
  orderBy,
  Timestamp,
  type FieldValue,
} from "firebase/firestore";

export interface Product {
  id: string;
  name: string;
  type: "sweater" | "tshirt" | "thread_craft" | "handmade_craft";
  description: string;
  basePrice: number; // Price charged to client
  creationCost: number; // Cost to create (employee salary)
  estimatedHours: number;
  skillsRequired: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export const createProduct = async (
  productData: Omit<Product, "id" | "createdAt" | "updatedAt">
) => {
  try {
    const productRef = doc(collection(db, "products"));
    const product: Product = {
      ...productData,
      id: productRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await setDoc(productRef, {
      ...product,
      createdAt: Timestamp.fromDate(product.createdAt),
      updatedAt: Timestamp.fromDate(product.updatedAt),
    });

    return product;
  } catch (error: any) {
    throw new Error(`Failed to create product: ${error.message}`);
  }
};

export const getProduct = async (
  productId: string
): Promise<Product | null> => {
  try {
    const productDoc = await getDoc(doc(db, "products", productId));
    if (!productDoc.exists()) {
      return null;
    }

    const data = productDoc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    } as Product;
  } catch (error: any) {
    throw new Error(`Failed to get product: ${error.message}`);
  }
};

export const getAllProducts = async (): Promise<Product[]> => {
  try {
    const productsQuery = query(
      collection(db, "products"),
      orderBy("name", "asc")
    );
    const productsSnapshot = await getDocs(productsQuery);

    return productsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Product;
    });
  } catch (error: any) {
    throw new Error(`Failed to get products: ${error.message}`);
  }
};

export const getActiveProducts = async (): Promise<Product[]> => {
  try {
    const products = await getAllProducts();
    return products.filter((product) => product.isActive);
  } catch (error: any) {
    throw new Error(`Failed to get active products: ${error.message}`);
  }
};

export const updateProduct = async (
  productId: string,
  updates: Partial<Omit<Product, "id" | "createdAt">>
) => {
  try {
    const updateData: Record<
      string,
      FieldValue | Partial<unknown> | undefined
    > = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    // Remove undefined fields
    const cleanUpdates = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    );

    await updateDoc(doc(db, "products", productId), cleanUpdates);
  } catch (error: any) {
    throw new Error(`Failed to update product: ${error.message}`);
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await deleteDoc(doc(db, "products", productId));
  } catch (error: any) {
    throw new Error(`Failed to delete product: ${error.message}`);
  }
};

export const toggleProductStatus = async (
  productId: string,
  isActive: boolean
) => {
  try {
    await updateProduct(productId, { isActive });
  } catch (error: any) {
    throw new Error(`Failed to toggle product status: ${error.message}`);
  }
};
