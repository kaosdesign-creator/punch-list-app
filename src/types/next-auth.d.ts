import 'next-auth'

declare module 'next-auth' {
  interface User {
    id: string
    username: string
    email: string
  }

  interface Session {
    user: {
      id: string
      username: string
      email: string
      name?: string | null
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
  }
}
