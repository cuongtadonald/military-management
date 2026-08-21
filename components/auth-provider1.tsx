/**
 * File: components/auth-provider.tsx
 * Mô tả: Auth context với permission management
 * Cập nhật: 2026-07-10 - Sửa logic PermissionLevel
 * 
 * Thay đổi:
 * - Thêm field permissionLevel vào User interface
 * - Sửa logic canManagePermissions: chỉ hiển thị cho PermissionLevel > 3
 * - Dùng useRef cho BroadcastChannel để tránh tạo mới liên tục
 */

"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

// ============================================================
// INTERFACES
// ============================================================

export interface User {
  userId: string
  fullName: string
  username: string
  roleName: string
  unitId: string
  unitName: string
  unitLevel: number
  hierarchyPath: string
  roleId: string
  permissionLevel: number // MỚI: Mức phân quyền (1=Sư đoàn, 2=Trung đoàn, 3=Tiểu đoàn, 4+=Đại đội...)
  permissions: Record<string, boolean>
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasPermission: (featureCode: string) => boolean
  canManagePermissions: () => boolean
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// BroadcastChannel name cho permission sync
const PERMISSION_CHANNEL = 'permission-updates'

// ============================================================
// PROVIDER
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Refresh permission cho user hiện tại - reload permissionLevel từ server
  const refreshPermissions = useCallback(async () => {
    if (!user?.userId) return
    
    try {
      const response = await fetch(`/api/auth/refresh-permission?userId=${user.userId}`)
      const result = await response.json()
      
      if (result.success) {
        const updatedUser: User = {
          ...user,
          permissionLevel: result.data.permissionLevel,
          permissions: {},
        }
        setUser(updatedUser)
        localStorage.setItem("user", JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error("Lỗi khi refresh permission:", error)
    }
  }, [user])

  // Check session khi mount
  useEffect(() => {
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        const parsed: User = JSON.parse(savedUser)
        setUser(parsed)
        // Nếu permissionLevel chưa có, thử load lại
        if (parsed.permissionLevel === undefined) {
          fetch(`/api/auth/refresh-permission?userId=${parsed.userId}`)
            .then(r => r.json())
            .then(result => {
              if (result.success) {
                const updatedUser: User = { ...parsed, permissionLevel: result.data.permissionLevel }
                setUser(updatedUser)
                localStorage.setItem("user", JSON.stringify(updatedUser))
              }
            })
            .catch(() => {})
        }
      } catch {
        localStorage.removeItem("user")
      }
    }
    setIsLoading(false)
  }, [])

  // Setup BroadcastChannel cho realtime sync - chỉ setup 1 lần
  useEffect(() => {
    if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
      return
    }

    // Tạo channel 1 lần
    if (!channelRef.current) {
      channelRef.current = new BroadcastChannel(PERMISSION_CHANNEL)
    }

    const channel = channelRef.current

    // Lắng nghe permission updates từ các tab khác
    const handleMessage = async (event: MessageEvent) => {
      const { type, userId, permissionLevel } = event.data
      
      if (type === 'permission_update' && userId) {
        // Lấy user hiện tại từ state hoặc localStorage
        const currentUser = user || JSON.parse(localStorage.getItem("user") || "null")
        
        if (currentUser && currentUser.userId === userId) {
          // User hiện tại bị ảnh hưởng → cập nhật permissionLevel
          const updatedUser: User = {
            ...currentUser,
            permissionLevel: permissionLevel ?? currentUser.permissionLevel,
            permissions: {},
          }
          setUser(updatedUser)
          localStorage.setItem("user", JSON.stringify(updatedUser))
          
          // Force re-render các component khác
          window.dispatchEvent(new CustomEvent('permission_changed', { 
            detail: { userId, permissionLevel } 
          }))
        }
      }
    }

    channel.addEventListener('message', handleMessage)

    // Listen storage event cho cross-tab sync (fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user" && e.newValue) {
        try {
          const updatedUser: User = JSON.parse(e.newValue)
          const currentUser = user || JSON.parse(localStorage.getItem("user") || "null")
          if (currentUser && updatedUser.userId === currentUser.userId) {
            setUser(updatedUser)
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Cleanup khi unmount component
    return () => {
      channel.removeEventListener('message', handleMessage)
      window.removeEventListener('storage', handleStorageChange)
      // KHÔNG đóng channel ở đây để các component khác vẫn dùng được
    }
  }, [user])

  // Login
  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.message || "Đăng nhập thất bại")
      }

      // Load permission ngay sau khi login
      const userData: User = {
        userId: result.data.userId,
        fullName: result.data.fullName,
        username: result.data.username,
        roleName: result.data.roleName,
        unitId: result.data.unitId,
        unitName: result.data.unitName,
        unitLevel: result.data.unitLevel,
        hierarchyPath: result.data.hierarchyPath,
        roleId: result.data.roleId,
        permissionLevel: result.data.permissionLevel || 3,
        permissions: {},
      }

      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      router.push("/")
    } catch (error: any) {
      throw new Error(error.message || "Đăng nhập thất bại")
    }
  }

  // Logout
  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    router.push("/login")
  }

  // Check permission dựa trên PermissionLevel
  // PermissionLevel = 2 → có quyền (Thêm, Sửa, Xóa, Nhập/Xuất Excel)
  // PermissionLevel = 3 → bị giới hạn quyền (ẩn toàn bộ chức năng)
  const hasPermission = (_featureCode: string): boolean => {
    if (!user) return false
    return user.permissionLevel === 2
  }

  // Check nếu có thể quản lý permission
  // Logic: Chỉ hiển thị cho user có PermissionLevel < 3
  const canManagePermissions = (): boolean => {
    if (!user) return false
    return user.permissionLevel < 3
  }

  // Cleanup channel khi unmount hoặc tab đóng
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (channelRef.current) {
        channelRef.current.close()
        channelRef.current = null
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (channelRef.current) {
        channelRef.current.close()
        channelRef.current = null
      }
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        hasPermission,
        canManagePermissions,
        refreshPermissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}