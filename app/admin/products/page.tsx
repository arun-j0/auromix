"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import {
  Package,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  DollarSign,
  Clock,
  Users,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getAllProducts,
  deleteProduct,
  toggleProductStatus,
  type Product,
} from "@/lib/products";
import Link from "next/link";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const typeColors = {
  sweater: "bg-blue-100 text-blue-800",
  tshirt: "bg-green-100 text-green-800",
  thread_craft: "bg-purple-100 text-purple-800",
  handmade_craft: "bg-orange-100 text-orange-800",
};

const typeLabels = {
  sweater: "Sweater",
  tshirt: "T-Shirt",
  thread_craft: "Thread Craft",
  handmade_craft: "Handmade Craft",
};

export default function ProductsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.role !== "admin") {
            router.push("/");
            return;
          }
          setUser({ ...firebaseUser, ...userData });
          await loadProducts();
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadProducts = async () => {
    try {
      const productsData = await getAllProducts();
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Failed to load products");
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, filterType, filterStatus);
  };

  const handleTypeFilter = (type: string) => {
    setFilterType(type);
    applyFilters(searchTerm, type, filterStatus);
  };

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
    applyFilters(searchTerm, filterType, status);
  };

  const applyFilters = (search: string, type: string, status: string) => {
    let filtered = products;

    // Search filter
    if (search.trim() !== "") {
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.description.toLowerCase().includes(search.toLowerCase()) ||
          product.skillsRequired.some((skill) =>
            skill.toLowerCase().includes(search.toLowerCase())
          )
      );
    }

    // Type filter
    if (type !== "all") {
      filtered = filtered.filter((product) => product.type === type);
    }

    // Status filter
    if (status !== "all") {
      const isActive = status === "active";
      filtered = filtered.filter((product) => product.isActive === isActive);
    }

    setFilteredProducts(filtered);
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await deleteProduct(productId);
      toast.success("Product deleted successfully");
      await loadProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to delete product");
    }
  };

  const handleToggleStatus = async (
    productId: string,
    currentStatus: boolean
  ) => {
    try {
      await toggleProductStatus(productId, !currentStatus);
      toast.success(
        `Product ${!currentStatus ? "activated" : "deactivated"} successfully`
      );
      await loadProducts();
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast.error("Failed to update product status");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Manage product catalog and pricing</p>
          </div>
          <Link href="/admin/products/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Product
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name, description, or skills..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeFilter("all")}
                >
                  All Types
                </Button>
                <Button
                  variant={filterType === "sweater" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeFilter("sweater")}
                >
                  Sweaters
                </Button>
                <Button
                  variant={filterType === "tshirt" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleTypeFilter("tshirt")}
                >
                  T-Shirts
                </Button>
                <Button
                  variant={
                    filterType === "thread_craft" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleTypeFilter("thread_craft")}
                >
                  Thread Craft
                </Button>
                <Button
                  variant={
                    filterType === "handmade_craft" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleTypeFilter("handmade_craft")}
                >
                  Handmade
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filterStatus === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusFilter("all")}
                >
                  All Status
                </Button>
                <Button
                  variant={filterStatus === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusFilter("active")}
                >
                  Active
                </Button>
                <Button
                  variant={filterStatus === "inactive" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusFilter("inactive")}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products List */}
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{product.name}</h3>
                      <Badge className={typeColors[product.type]}>
                        {typeLabels[product.type]}
                      </Badge>
                      <Badge
                        variant={product.isActive ? "default" : "secondary"}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Base: ${product.basePrice}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span>Cost: ${product.creationCost}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>{product.estimatedHours}h estimated</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>
                          Created: {format(product.createdAt, "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>

                    {/* Skills Required */}
                    {product.skillsRequired.length > 0 && (
                      <div className="mt-3">
                        <div className="flex flex-wrap gap-2">
                          {product.skillsRequired
                            .slice(0, 4)
                            .map((skill, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs"
                              >
                                {skill}
                              </Badge>
                            ))}
                          {product.skillsRequired.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{product.skillsRequired.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleToggleStatus(product.id, product.isActive)
                      }
                    >
                      {product.isActive ? (
                        <ToggleRight className="h-4 w-4 mr-2" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 mr-2" />
                      )}
                      {product.isActive ? "Deactivate" : "Activate"}
                    </Button>

                    <Link href={`/admin/products/${product.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>

                    <Link href={`/admin/products/${product.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </Link>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 bg-transparent"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            delete the product "{product.name}" and remove it
                            from all future orders.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteProduct(product.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || filterType !== "all" || filterStatus !== "all"
                  ? "No products match your search criteria."
                  : "Get started by creating your first product."}
              </p>
              {!searchTerm &&
                filterType === "all" &&
                filterStatus === "all" && (
                  <Link href="/admin/products/new">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Product
                    </Button>
                  </Link>
                )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
