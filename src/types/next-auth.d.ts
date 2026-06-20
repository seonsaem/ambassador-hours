import 'next-auth';

declare module 'next-auth' {
  interface User {
    role?: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }
}

import 'next-auth/jwt';

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}
