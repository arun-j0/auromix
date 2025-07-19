"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/layout/header"
import { Building2, Plus, Search, Edit, Trash2, Eye, Phone, Mail, MapPin } from "lucide-react"
import { getAllCompanies, deleteCompany, type Company } from "@/lib/companies"
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

export default function CompaniesPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
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
          await loadCompanies()
        }
      } else {
        router.push("/auth/login")
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const loadCompanies = async () => {
    try {
      const companiesData = await getAllCompanies()
      setCompanies(companiesData)
      setFilteredCompanies(companiesData)
    } catch (error) {
      console.error("Error loading companies:", error)
    }
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim() === "") {
      setFilteredCompanies(companies)
    } else {
      const filtered = companies.filter(
        (company) =>
          company.name.toLowerCase().includes(term.toLowerCase()) ||
          company.email.toLowerCase().includes(term.toLowerCase()) ||
          company.contactPerson.toLowerCase().includes(term.toLowerCase()),
      )
      setFilteredCompanies(filtered)
    }
  }

  const handleDeleteCompany = async (companyId: string) => {
    try {
      await deleteCompany(companyId)
      await loadCompanies()
    } catch (error) {
      console.error("Error deleting company:", error)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} notificationCount={5} />

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
            <p className="text-gray-600">Manage client companies</p>
          </div>
          <Link href="/admin/companies/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Company
            </Button>
          </Link>
        </div>

        {/* Rest of the content remains the same */}
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search companies by name, email, or contact person..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Companies Grid and empty state remain the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{company.name}</CardTitle>
                    <CardDescription>{company.contactPerson}</CardDescription>
                  </div>
                  <Badge variant={company.isActive ? "default" : "secondary"}>
                    {company.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="mr-2 h-4 w-4" />
                    {company.email}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="mr-2 h-4 w-4" />
                    {company.phone}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="mr-2 h-4 w-4" />
                    {company.address.city}, {company.address.state}
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="flex gap-2">
                    <Link href={`/admin/companies/${company.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href={`/admin/companies/${company.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 bg-transparent">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Company</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {company.name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteCompany(company.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm
                  ? "No companies match your search criteria."
                  : "Get started by adding your first client company."}
              </p>
              {!searchTerm && (
                <Link href="/admin/companies/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Company
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
