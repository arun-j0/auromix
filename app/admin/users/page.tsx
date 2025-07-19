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
import { getAllUsers, updateUser, deleteUser, type User } from "@/lib/users"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const roleColors = {
  admin: "bg-red-100 text-red-800",
  agent: "bg-blue-100 text-blue-800",
  employee: "bg-green-100 text-green-800",
}

export default function UsersPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          if (userData.role !== "admin") {
            router.push("/")
            return
          }
          setUser({ ...firebaseUser, ...userData })
          await loadUsers()
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadUsers = async () => {
    try {
      const usersData = await getAllUsers()
      setUsers(usersData)
      setFilteredUsers(usersData)
    } catch (error) {
      console.error("Error loading users:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    filterUsers(term, activeTab)
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    filterUsers(searchTerm, tab)
  }

  const filterUsers = (searchTerm: string, role: string) => {
    let filtered = users

    // Filter by role
    if (role !== "all") {
      filtered = filtered.filter((user) => user.role === role)
    }

    // Filter by search term
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (user.phone && user.phone.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredUsers(filtered)
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { isActive: !currentStatus })
      await loadUsers()
    } catch (error) {
      console.error("Error updating user status:", error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteUser(userId)
      await loadUsers()
    } catch (error) {
      console.error("Error deleting user:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const userCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === "admin").length,
    agent: users.filter((u) => u.role === "agent").length,
    employee: users.filter((u) => u.role === "employee").length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their roles</p>
          </div>
          <Link href="/admin/users/new">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </Link>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 bg-white"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="mb-6">
          <TabsList className="grid w-full grid-cols-4 bg-white">
            <TabsTrigger value="all" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              All Users ({userCounts.all})
            </TabsTrigger>
            <TabsTrigger value="admin" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Admins ({userCounts.admin})
            </TabsTrigger>
            <TabsTrigger value="agent" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Agents ({userCounts.agent})
            </TabsTrigger>
            <TabsTrigger value="employee" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              Employees ({userCounts.employee})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* Users Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredUsers.map((userData) => (
                <Card key={userData.uid} className="hover:shadow-lg transition-shadow bg-white">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg text-gray-900">{userData.name}</CardTitle>
                        <CardDescription className="text-gray-600">{userData.email}</CardDescription>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Badge className={roleColors[userData.role]}>{userData.role.toUpperCase()}</Badge>
                        <Badge variant={userData.isActive ? "default" : "secondary"}>
                          {userData.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {userData.phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Phone className="mr-2 h-4 w-4" />
                          {userData.phone}
                        </div>
                      )}
                      {userData.skills && userData.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {userData.skills.slice(0, 3).map((skill, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {userData.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{userData.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Joined: {userData.createdAt.toLocaleDateString()}</p>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t">
                      <div className="flex gap-2">
                        <Link href={`/admin/users/${userData.uid}`}>
                          <Button variant="outline" size="sm" className="bg-white">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/admin/users/${userData.uid}/edit`}>
                          <Button variant="outline" size="sm" className="bg-white">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleUserStatus(userData.uid, userData.isActive)}
                          className={
                            userData.isActive
                              ? "text-orange-600 hover:text-orange-700 bg-white"
                              : "text-green-600 hover:text-green-700 bg-white"
                          }
                        >
                          {userData.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-white">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-white">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete User</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {userData.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-white">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(userData.uid)}
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

            {filteredUsers.length === 0 && (
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchTerm ? "No users match your search criteria." : "Get started by adding your first user."}
                  </p>
                  {!searchTerm && (
                    <Link href="/admin/users/new">
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Add User
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
