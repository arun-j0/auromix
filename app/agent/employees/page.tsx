"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Users, Plus, Search, Edit, Trash2, Eye, Phone, UserCheck, UserX } from "lucide-react"
import { getEmployeesByAgent, updateUser, deleteUser, type User } from "@/lib/users"
import Link from "next/link"
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
} from "@/components/ui/alert-dialog"

export default function AgentEmployeesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [employees, setEmployees] = useState<User[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role !== "agent") {
            router.push("/")
            return
          }
          setUser({ ...firebaseUser, ...userData })
          await loadEmployees(firebaseUser.uid)
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadEmployees = async (agentId: string) => {
    try {
      const employeesData = await getEmployeesByAgent(agentId)
      setEmployees(employeesData)
      setFilteredEmployees(employeesData)
    } catch (error) {
      console.error("Error loading employees:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim() === "") {
      setFilteredEmployees(employees)
    } else {
      const filtered = employees.filter(
        (employee) =>
          employee.name.toLowerCase().includes(term.toLowerCase()) ||
          employee.email.toLowerCase().includes(term.toLowerCase()) ||
          (employee.phone && employee.phone.toLowerCase().includes(term.toLowerCase())),
      )
      setFilteredEmployees(filtered)
    }
  }

  const handleToggleEmployeeStatus = async (employeeId: string, currentStatus: boolean) => {
    try {
      await updateUser(employeeId, { isActive: !currentStatus })
      await loadEmployees(user.uid)
    } catch (error) {
      console.error("Error updating employee status:", error)
    }
  }

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      await deleteUser(employeeId)
      await loadEmployees(user.uid)
    } catch (error) {
      console.error("Error deleting employee:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={3} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Employees</h1>
            <p className="text-gray-600">Manage your assigned team members</p>
          </div>
          <Link href="/agent/employees/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Employee
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <Card key={employee.uid} className="hover:shadow-lg transition-shadow bg-white">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-gray-900">{employee.name}</CardTitle>
                    <CardDescription className="text-gray-600">{employee.email}</CardDescription>
                  </div>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {employee.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="mr-2 h-4 w-4" />
                      {employee.phone}
                    </div>
                  )}
                  {employee.skills && employee.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {employee.skills.slice(0, 3).map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {employee.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{employee.skills.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Joined: {employee.createdAt.toLocaleDateString()}</p>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Link href={`/agent/employees/${employee.uid}`}>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/agent/employees/${employee.uid}/edit`}>
                      <Button variant="outline" size="sm" className="bg-white">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleEmployeeStatus(employee.uid, employee.isActive)}
                      className={
                        employee.isActive
                          ? "text-orange-600 hover:text-orange-700 bg-white"
                          : "text-green-600 hover:text-green-700 bg-white"
                      }
                    >
                      {employee.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-white">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete {employee.name}? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEmployee(employee.uid)}
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

        {filteredEmployees.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? "No employees match your search criteria." : "Get started by adding your first employee."}
              </p>
              {!searchTerm && (
                <Link href="/agent/employees/new">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
