"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  Edit,
  DollarSign,
} from "lucide-react";
import {
  getUser,
  getEmployeesByAgent,
  type User as UserType,
} from "@/lib/users";
import { getPaymentsByEmployee } from "@/lib/payments";
import Link from "next/link";

interface PageProps {
  params: {
    id: string;
  };
}

// ✅ async component to return a Promise
export default async function UserDetailsPage({ params }: PageProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<UserType | null>(null);
  const [employees, setEmployees] = useState<UserType[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
          setCurrentUser({ ...firebaseUser, ...userData });
          await loadUserDetails(params.id);
        }
      } else {
        router.push("/auth/login");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router, params.id]);

  const loadUserDetails = async (userId: string) => {
    try {
      const userData = await getUser(userId);
      setViewUser(userData);

      if (userData?.role === "agent") {
        const employeesData = await getEmployeesByAgent(userId);
        setEmployees(employeesData);
      } else if (userData?.role === "employee") {
        const paymentsData = await getPaymentsByEmployee(userId);
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error("Error loading user details:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!currentUser || !viewUser) {
    return null;
  }

  const totalEarnings = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingEarnings = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={currentUser} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/users">
            <Button variant="outline" size="sm" className="bg-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Users
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {viewUser.name}
            </h1>
            <p className="text-gray-600">User Details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User Information */}
          <div className="lg:col-span-2">
            <Card className="bg-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      User Information
                    </CardTitle>
                    <CardDescription>
                      Personal and account details
                    </CardDescription>
                  </div>
                  <Link href={`/admin/users/${viewUser.uid}/edit`}>
                    <Button variant="outline" size="sm" className="bg-white">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <p className="text-gray-900 font-medium">{viewUser.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Role
                    </label>
                    <div className="mt-1">
                      <Badge
                        className={`${
                          viewUser.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : viewUser.role === "agent"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {viewUser.role.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </label>
                    <p className="text-gray-900">{viewUser.email}</p>
                  </div>
                  {viewUser.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone
                      </label>
                      <p className="text-gray-900">{viewUser.phone}</p>
                    </div>
                  )}
                </div>

                {viewUser.skills && viewUser.skills.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Skills
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {viewUser.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Joined Date
                    </label>
                    <p className="text-gray-900">
                      {viewUser.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Status
                    </label>
                    <div className="mt-1">
                      <Badge
                        variant={viewUser.isActive ? "default" : "secondary"}
                      >
                        {viewUser.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Agent's Employees */}
          {viewUser.role === "agent" && (
            <div>
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Employees under this agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {employees.length > 0 ? (
                      employees.map((employee) => (
                        <div
                          key={employee.uid}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {employee.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {employee.email}
                            </p>
                            {employee.skills && employee.skills.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {employee.skills
                                  .slice(0, 2)
                                  .map((skill, index) => (
                                    <Badge
                                      key={index}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {skill}
                                    </Badge>
                                  ))}
                                {employee.skills.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{employee.skills.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={
                              employee.isActive ? "default" : "secondary"
                            }
                          >
                            {employee.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-center py-4">
                        No employees assigned
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Employee Payments */}
          {viewUser.role === "employee" && (
            <div>
              <Card className="bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Payment Summary
                  </CardTitle>
                  <CardDescription>
                    Earnings and payment history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <p className="text-sm font-medium text-green-600">
                          Total Paid
                        </p>
                        <p className="text-lg font-bold text-green-700">
                          ${totalEarnings.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm font-medium text-yellow-600">
                          Pending
                        </p>
                        <p className="text-lg font-bold text-yellow-700">
                          ${pendingEarnings.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Recent Payments
                      </p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {payments.slice(0, 5).map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded"
                          >
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {payment.productName}
                              </p>
                              <p className="text-xs text-gray-600">
                                {payment.completedAt.toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">
                                ${payment.amount.toFixed(2)}
                              </p>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  payment.status === "paid"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {payment.status.toUpperCase()}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {payments.length === 0 && (
                          <p className="text-gray-500 text-center py-4">
                            No payments yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
