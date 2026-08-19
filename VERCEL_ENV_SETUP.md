# Vercel Environment Variables Setup

To fix the `error=Configuration` issue when logging in, you need to set the following environment variables in your Vercel project:

## Required Environment Variables

### 1. NEXTAUTH_SECRET (Required)
This is a secret key used to encrypt JWT tokens. Generate a random secret:

**How to generate:**
```bash
openssl rand -base64 32
```

Or use an online generator: https://generate-secret.vercel.app/32

**In Vercel:**
1. Go to your project settings: https://vercel.com/dashboard
2. Select your project: `fast-keep`
3. Go to Settings → Environment Variables
4. Add:
   - **Name:** `NEXTAUTH_SECRET`
   - **Value:** (paste your generated secret)
   - **Environment:** Production, Preview, Development (select all)

### 2. NEXTAUTH_URL (Required)
The base URL of your application:

**In Vercel:**
- **Name:** `NEXTAUTH_URL`
- **Value:** `https://fast-keep.vercel.app`
- **Environment:** Production, Preview, Development (select all)

### 3. DATABASE_URL (Required)
Your PostgreSQL database connection string:

**In Vercel:**
- **Name:** `DATABASE_URL`
- **Value:** `postgresql://user:password@host:port/database?sslmode=require`
- **Environment:** Production, Preview, Development (select all)

## Optional Environment Variables

### OAuth Providers (Optional)
If you want to enable Google or GitHub login:

**Google OAuth:**
- **Name:** `GOOGLE_CLIENT_ID`
- **Name:** `GOOGLE_CLIENT_SECRET`

**GitHub OAuth:**
- **Name:** `GITHUB_CLIENT_ID`
- **Name:** `GITHUB_CLIENT_SECRET`

## Steps to Fix the Configuration Error

1. **Generate NEXTAUTH_SECRET:**
   ```bash
   openssl rand -base64 32
   ```

2. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Select your project: `fast-keep`
   - Go to Settings → Environment Variables

3. **Add all required variables:**
   - `NEXTAUTH_SECRET` (generated secret)
   - `NEXTAUTH_URL` (`https://fast-keep.vercel.app`)
   - `DATABASE_URL` (your PostgreSQL connection string)

4. **Redeploy:**
   - After adding environment variables, go to the Deployments tab
   - Click the three dots (⋯) on the latest deployment
   - Select "Redeploy"
   - Or push a new commit to trigger a redeploy

## Quick Check

After setting up, verify your environment variables are set:
- Go to Vercel Dashboard → Your Project → Settings → Environment Variables
- Make sure all three required variables are present
- Ensure they're enabled for "Production" environment

## Common Issues

1. **"Configuration" error:** Usually means `NEXTAUTH_SECRET` or `NEXTAUTH_URL` is missing
2. **Database connection errors:** Check `DATABASE_URL` is correct
3. **OAuth not working:** Make sure OAuth credentials are set if you want to use them (optional)

## Testing

After redeploying, try logging in again. The configuration error should be resolved if all required environment variables are set correctly.
