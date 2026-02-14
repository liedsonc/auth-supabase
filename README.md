# @liedsonc/auth-supabase

Supabase integration adapter for `@liedsonc/core-auth-kit`. This package provides a production-ready Supabase backend implementation and includes all core auth kit functionality in a single install.

## Installation

```bash
npm install @liedsonc/auth-supabase @supabase/supabase-js bcryptjs
```

**Note:** `@liedsonc/core-auth-kit` is included as a dependency, so you don't need to install it separately. All core functionality (AuthUIProvider, pages, types) is re-exported from this package.

## Setup

### 1. Database Schema

You can set up the required tables in either of two ways:

**Option A: Run the migration command (recommended)**

If you have the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and your project linked (`supabase link`), run:

```bash
npx auth-supabase-migrate
```

This runs the migration SQL against your linked Supabase project. If the Supabase CLI is not available, the command prints the SQL so you can run it manually (see Option B).

**Option B: Run the SQL in the Supabase dashboard**

Otherwise, run the migration SQL in your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql/new). The full schema is below (or run `npx auth-supabase-migrate` and copy the printed SQL):

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE TABLE IF NOT EXISTS verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Environment Variables

Configure the following environment variables in your `.env.local` file:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Your Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | No | Base URL for your app (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_NAME` | No | Your app name (default: `App`) |
| `RESEND_API_KEY` | No | Resend API key (enables email verification and password reset emails) |
| `RESEND_FROM_EMAIL` | No | Email address to send emails from |
| `RESEND_FROM_NAME` | No | Name to send emails from |

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` should never be exposed to the client. Ensure it's only used in server-side code (API routes, server components, etc.).

### 3. Usage

With environment variables configured, you can use the auth client with zero configuration:

```typescript
import { AuthUIProvider, getSupabaseAuthClient } from '@liedsonc/auth-supabase';

function App() {
  return (
    <AuthUIProvider
      config={{
        authClient: getSupabaseAuthClient(),
      }}
    >
      {/* Your app */}
    </AuthUIProvider>
  );
}
```

That's it! The `getSupabaseAuthClient()` function automatically reads all configuration from your environment variables.

## Advanced: Programmatic Configuration

If you need to configure the adapter programmatically (e.g., for testing or dynamic configuration), you can use `createSupabaseAuthAdapter`:

```typescript
import { AuthUIProvider, createSupabaseAuthAdapter } from '@liedsonc/auth-supabase';

const supabaseAuthClient = createSupabaseAuthAdapter({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  appName: process.env.NEXT_PUBLIC_APP_NAME,
  resendApiKey: process.env.RESEND_API_KEY,
  resendFromEmail: process.env.RESEND_FROM_EMAIL,
  resendFromName: process.env.RESEND_FROM_NAME,
});

function App() {
  return (
    <AuthUIProvider
      config={{
        authClient: supabaseAuthClient,
      }}
    >
      {/* Your app */}
    </AuthUIProvider>
  );
}
```

## Features

- ✅ User registration with email verification
- ✅ Login with email and password
- ✅ Password reset flow
- ✅ Email verification
- ✅ Secure password hashing (bcrypt with 12 salt rounds)
- ✅ Token generation and management
- ✅ Email notifications via Resend (optional)
- ✅ All core auth kit functionality included

## Security

- Service role key is never exposed to the client
- Passwords are hashed using bcrypt with 12 salt rounds
- Tokens are generated using crypto.randomBytes
- Email existence is not revealed in forgot password flow
- All database queries use parameterized statements

## Contributors

- **liedsonc** – author

## License

MIT
